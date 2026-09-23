import argparse
import asyncio
import json
from pathlib import Path

from career_quest.bootstrap import database_factory
from career_quest.demo import seed
from career_quest.infrastructure.settings import Settings
from career_quest.modules.data_import.application.importer import ImportDataset
from career_quest.modules.data_import.domain.package import Package
from career_quest.modules.data_import.infrastructure.parser import (
    read_directory,
    read_zip,
)


async def run() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["seed", "bootstrap", "import"])
    parser.add_argument("--path", type=Path)
    parser.add_argument("--source", default="canonical")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    settings = Settings()
    engine, factory = database_factory(settings)
    try:
        if args.command == "seed" or (
            args.command == "bootstrap" and settings.demo_seed
        ):
            if (
                settings.environment == "production"
                or not settings.demo_password
            ):
                raise ValueError(
                    "Demo seed requires development/test and DEMO_PASSWORD"
                )
            await seed(
                factory,
                settings.demo_password.get_secret_value(),
                settings.business_date,
            )
            print("Synthetic demo initialized (existing demo is preserved).")
        elif args.command == "import":
            if not args.path:
                parser.error("--path is required")
            path = Path(args.path)

            def load() -> Package:
                return (
                    read_directory(path)
                    if path.is_dir()
                    else read_zip(path.read_bytes())
                )

            package = await asyncio.to_thread(load)
            report = await ImportDataset(factory).execute(
                package, args.source, None, args.dry_run
            )
            print(json.dumps(report, ensure_ascii=False, indent=2))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
