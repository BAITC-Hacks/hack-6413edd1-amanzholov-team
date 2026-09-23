import io
import json
import stat
from zipfile import ZipFile, ZipInfo

import pytest

from career_quest.modules.data_import.infrastructure.parser import read_zip
from career_quest.shared.domain.core import BusinessError


@pytest.mark.parametrize(
    "filename",
    [
        "../employees.json",
        "/employees.json",
        "C:/employees.json",
        "a/../../skills.json",
    ],
)
def test_zip_paths(filename: str) -> None:
    buffer = io.BytesIO()
    with ZipFile(buffer, "w") as archive:
        archive.writestr(filename, "{}")
    with pytest.raises(BusinessError, match="unsafe_zip"):
        read_zip(buffer.getvalue())


def test_zip_symlinks_and_duplicate_names() -> None:
    buffer = io.BytesIO()
    with ZipFile(buffer, "w") as archive:
        link = ZipInfo("employees.json")
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        archive.writestr(link, "target")
    with pytest.raises(BusinessError, match="unsafe_zip"):
        read_zip(buffer.getvalue())
    buffer = io.BytesIO()
    with ZipFile(buffer, "w") as archive:
        for prefix in ["a/", "b/"]:
            archive.writestr(prefix + "employees.json", "{}")
    with pytest.raises(BusinessError, match="duplicate_zip_file"):
        read_zip(buffer.getvalue())


def test_wrapped_json_and_mac_metadata() -> None:
    buffer = io.BytesIO()
    with ZipFile(buffer, "w") as archive:
        archive.writestr(
            "data/employees.json",
            json.dumps(
                {"meta": {"as_of_date": "2026-10-01"}, "employees": []}
            ),
        )
        archive.writestr("__MACOSX/._employees.json", "ignored")
    package = read_zip(buffer.getvalue())
    assert package.as_of_date.isoformat() == "2026-10-01"
    assert package.employees == []
