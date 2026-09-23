from datetime import date, timedelta


def experience_days(periods: list[tuple[date, date]]) -> int:
    """Calendar union, not a sum of overlapping project durations."""
    merged: list[tuple[date, date]] = []
    for start, end in sorted(periods):
        if merged and start <= merged[-1][1] + timedelta(days=1):
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    return sum((end - start).days + 1 for start, end in merged)
