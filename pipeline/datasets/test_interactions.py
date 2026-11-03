from datetime import datetime, timezone

from pipeline.datasets.interactions import Interaction, temporal_leave_last_out


def test_temporal_leave_last_out_preserves_order():
    rows = [
        Interaction("u1", 2, datetime(2024, 1, 2, tzinfo=timezone.utc)),
        Interaction("u1", 1, datetime(2024, 1, 1, tzinfo=timezone.utc)),
        Interaction("u2", 3, datetime(2024, 1, 1, tzinfo=timezone.utc)),
    ]

    train, test = temporal_leave_last_out(rows)

    assert [row.item_id for row in train["u1"]] == [1]
    assert test["u1"].item_id == 2
    assert "u2" not in train
