import ast
from pathlib import Path


def test_dependency_direction() -> None:
    root = Path(__file__).resolve().parents[2] / "src" / "career_quest"
    for file in root.rglob("*.py"):
        if "domain" not in file.parts and "application" not in file.parts:
            continue
        tree = ast.parse(file.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            modules = []
            if isinstance(node, ast.Import):
                modules = [alias.name for alias in node.names]
            if isinstance(node, ast.ImportFrom) and node.module:
                modules = [node.module]
            for module in modules:
                assert module.split(".")[0] not in {
                    "fastapi",
                    "sqlalchemy",
                    "pydantic",
                    "httpx",
                }, (file, module)
                assert ".infrastructure" not in module, (file, module)
                assert ".presentation" not in module, (file, module)
