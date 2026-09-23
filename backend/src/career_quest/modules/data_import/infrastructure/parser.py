import csv
import io
import json
import stat
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile

from career_quest.modules.data_import.domain.package import (
    Package,
    day,
    obj,
    seq,
)
from career_quest.shared.application.commands import json_value
from career_quest.shared.domain.core import BusinessError, Json, require

CANONICAL = {
    "skills.json",
    "events.json",
    "employees.json",
    "activity_history.csv",
}
MAX_ZIP = 10 * 1024 * 1024
MAX_UNPACKED = 40 * 1024 * 1024


def parse_files(files: dict[str, bytes]) -> Package:
    documents: dict[str, dict[str, Json]] = {}
    dates = set()
    try:
        for name, content in files.items():
            if name.endswith(".json"):
                document = obj(
                    json_value(json.loads(content.decode("utf-8-sig")))
                )
                dates.add(day(obj(document.get("meta"))["as_of_date"]))
                documents[name] = document
        require(len(dates) == 1, "missing_or_inconsistent_as_of_date", 422)
        package = Package(as_of_date=dates.pop())
        for filename, key in [
            ("skills.json", "skills"),
            ("skills.json", "role_profiles"),
            ("events.json", "events"),
            ("employees.json", "employees"),
        ]:
            if filename in documents:
                setattr(
                    package,
                    key,
                    [obj(v) for v in seq(documents[filename].get(key))],
                )
        if "activity_history.csv" in files:
            reader = csv.DictReader(
                io.StringIO(files["activity_history.csv"].decode("utf-8-sig"))
            )
            expected = {
                "record_id",
                "employee_id",
                "event_id",
                "date",
                "due_date",
                "status",
                "completion_pct",
                "score",
                "feedback_rating",
                "assigned_by",
            }
            require(
                set(reader.fieldnames or []) == expected,
                "invalid_history_columns",
                422,
            )
            for row in reader:
                require(
                    None not in row
                    and all(v is not None for v in row.values()),
                    "invalid_history_row",
                    422,
                )
                package.history.append(
                    {k: v if v != "" else None for k, v in row.items()}
                )
        return package
    except (ValueError, KeyError, UnicodeError) as exc:
        raise BusinessError("invalid_import", 422) from exc


def read_directory(path: Path) -> Package:
    files = {
        name: (path / name).read_bytes()
        for name in CANONICAL
        if (path / name).is_file()
    }
    require(
        sum(map(len, files.values())) <= MAX_UNPACKED, "import_too_large", 422
    )
    return parse_files(files)


def read_zip(content: bytes) -> Package:
    require(len(content) <= MAX_ZIP, "import_too_large", 422)
    files: dict[str, bytes] = {}
    try:
        with ZipFile(io.BytesIO(content)) as archive:
            members = archive.infolist()
            require(len(members) <= 200, "too_many_zip_members", 422)
            require(
                sum(i.file_size for i in members) <= MAX_UNPACKED,
                "import_too_large",
                422,
            )
            for info in members:
                path = PurePosixPath(info.filename.replace("\\", "/"))
                require(
                    not path.is_absolute()
                    and ".." not in path.parts
                    and not any(":" in p for p in path.parts),
                    "unsafe_zip",
                    422,
                )
                require(
                    not stat.S_ISLNK(info.external_attr >> 16),
                    "unsafe_zip",
                    422,
                )
                if (
                    "__MACOSX" in path.parts
                    or path.name == ".DS_Store"
                    or path.name.startswith("._")
                    or info.is_dir()
                ):
                    continue
                if path.name in CANONICAL:
                    require(path.name not in files, "duplicate_zip_file", 422)
                    files[path.name] = archive.read(info)
    except (BadZipFile, RuntimeError, NotImplementedError) as exc:
        raise BusinessError("invalid_zip", 422) from exc
    require(bool(files), "empty_import", 422)
    return parse_files(files)
