import pytest
from unittest.mock import MagicMock
from pydantic import ValidationError

def test_taste_control_payload_validation():
    """Verify that taste control values must be between 0 and 100."""
    from routes.taste_controls import TasteControlPayload
    
    # Valid payload
    payload = TasteControlPayload(discovery=50, global_pref=10, challenge=90, pace=0, hiddenGems=100, diversityBoost=True)
    assert payload.discovery == 50
    
    # Invalid payloads
    with pytest.raises(ValidationError):
        TasteControlPayload(discovery=150)
        
    with pytest.raises(ValidationError):
        TasteControlPayload(challenge=-10)

def test_feedback_payload_validation():
    """Verify feedback API rejects invalid reasons or actions."""
    from routes.feedback import FeedbackPayload
    
    # Valid
    FeedbackPayload(movieId=1, action="not_interested", reason="too_slow")
    
    # Invalid action
    with pytest.raises(ValidationError):
        FeedbackPayload(movieId=1, action="invalid_action", reason="too_slow")
        
    # Invalid reason
    with pytest.raises(ValidationError):
        FeedbackPayload(movieId=1, action="not_interested", reason="i_hate_this_movie")
