"""Business scenario checks using a temporary database. Run: python -m unittest -v."""
import csv
import io
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import server


class CareerQuestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.original_db = server.DB_PATH
        server.DB_PATH = Path(cls.temp.name) / 'test.db'
        server.initialize()
        cls.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.http.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join()
        server.DB_PATH = cls.original_db
        cls.temp.cleanup()

    def setUp(self):
        with server.connect() as con:
            con.execute('DELETE FROM completions')
            con.execute('DELETE FROM employees')
        server.initialize()

    def request(self, path, payload=None):
        req = urllib.request.Request(self.base + path, data=json.dumps(payload).encode() if payload is not None else None, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)

    def get_profile(self, pid='alina'):
        with server.connect() as con:
            return server.profile(con, pid)

    def sample(self, **kwargs):
        return dict(name='Новый сотрудник', role='Дизайнер', grade='Middle', skills={'UX-исследования': 30}, target={'UX-исследования': 80}, **kwargs)

    def test_complete_increases_progress_persists_and_changes_recommendations(self):
        before = self.get_profile()
        status, result = self.request('/api/complete', dict(employeeId='alina', activityId='systems', answer=0))
        self.assertEqual(status, 200)
        self.assertGreater(result['after'], before['progress'])
        after = self.get_profile()
        self.assertEqual(after['skills']['Дизайн-системы'], 60)
        self.assertEqual(len(after['history']), 1)
        self.assertNotIn('systems', [r['activityId'] for r in server.recommend(after)])

    def test_wrong_answer_does_not_change_profile(self):
        before = self.get_profile()
        status, _ = self.request('/api/complete', dict(employeeId='alina', activityId='systems', answer=2))
        self.assertEqual(status, 422)
        self.assertEqual(self.get_profile(), before)

    def test_repeat_and_concurrent_completion_award_only_once(self):
        payload = dict(employeeId='alina', activityId='systems', answer=0)
        with ThreadPoolExecutor(max_workers=5) as pool:
            responses = list(pool.map(lambda _: self.request('/api/complete', payload), range(5)))
        self.assertTrue(all(s == 200 for s, _ in responses))
        self.assertEqual(sum(not r['alreadyCompleted'] for _, r in responses), 1)
        self.assertEqual(self.get_profile()['skills']['Дизайн-системы'], 60)

    def test_no_match_and_completed_goal_are_distinguishable(self):
        arman = self.get_profile('arman')
        ilyas = self.get_profile('ilyas')
        self.assertEqual(server.recommend(arman), [])
        self.assertLess(arman['progress'], 100)
        self.assertEqual(server.recommend(ilyas), [])
        self.assertEqual(ilyas['progress'], 100)

    def test_import_unknown_profile_gets_recommendations(self):
        status, result = self.request('/api/import', dict(format='json', content=json.dumps([self.sample(id='new-person')], ensure_ascii=False)))
        self.assertEqual(status, 200)
        self.assertEqual(result['ids'], ['new-person'])
        self.assertTrue(server.recommend(self.get_profile('new-person')))

    def test_invalid_import_is_atomic(self):
        invalid = self.sample(id='invalid')
        invalid['skills'] = {'UX-исследования': 101}
        status, _ = self.request('/api/import', dict(content=json.dumps([self.sample(id='valid'), invalid])))
        self.assertEqual(status, 400)
        self.assertEqual(len(server.state()['employees']), 6)

    def test_duplicate_profile_preserves_existing_progress(self):
        before = self.get_profile()
        status, _ = self.request('/api/import', dict(content=json.dumps([self.sample(id='alina')])))
        self.assertEqual(status, 400)
        self.assertEqual(self.get_profile(), before)

    def test_csv_with_utf8_bom(self):
        record = self.sample(id='csv-person')
        for key in ['skills', 'target']:
            record[key] = json.dumps(record[key], ensure_ascii=False)
        stream = io.StringIO()
        writer = csv.DictWriter(stream, fieldnames=list(record))
        writer.writeheader()
        writer.writerow(record)
        status, result = self.request('/api/import', dict(format='csv', content='\ufeff' + stream.getvalue()))
        self.assertEqual(status, 200)
        self.assertEqual(result['count'], 1)

    def test_answers_are_not_exposed(self):
        status, result = self.request('/api/state')
        self.assertEqual(status, 200)
        self.assertTrue(all('answer' not in a for a in result['activities']))

    def test_ai_failure_falls_back_without_blocking(self):
        with patch.dict(server.os.environ, {'CQ_AI_URL': 'http://127.0.0.1:1/unavailable', 'GEMINI_API_KEY': ''}):
            status, result = self.request('/api/recommend', dict(employeeId='alina'))
        self.assertEqual(status, 200)
        self.assertEqual(result['mode'], 'local')
        self.assertTrue(result['warning'])
        self.assertTrue(result['recommendations'])

    def test_unknown_activity_rejected(self):
        status, _ = self.request('/api/complete', dict(employeeId='alina', activityId='missing', answer=0))
        self.assertEqual(status, 400)


if __name__ == '__main__':
    unittest.main()
