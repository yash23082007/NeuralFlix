import json
import os
import logging

logger = logging.getLogger("ID_MAPPER")

class MovieIDMapper:
    """Maps TMDB IDs to sequential model indices and back."""
    
    def __init__(self, path="models/id_map.json"):
        self.path = path
        self.tmdb_to_idx = {}
        self.idx_to_tmdb = {}
        self._load()
    
    def _load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, "r") as f:
                    data = json.load(f)
                    self.tmdb_to_idx = {int(k): int(v) for k, v in data.get("t2i", {}).items()}
                    self.idx_to_tmdb = {int(k): int(v) for k, v in data.get("i2t", {}).items()}
                logger.info(f"Loaded ID mapper with {len(self.tmdb_to_idx)} mappings from {self.path}")
            except Exception as e:
                logger.error(f"Failed to load ID map from {self.path}: {e}")
    
    def build_from_db(self, tmdb_ids: list):
        self.tmdb_to_idx = {}
        self.idx_to_tmdb = {}
        for i, tmdb_id in enumerate(sorted(list(set(tmdb_ids)))):
            self.tmdb_to_idx[tmdb_id] = i
            self.idx_to_tmdb[i] = tmdb_id
        
        # Save mapping
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        try:
            with open(self.path, "w") as f:
                json.dump({"t2i": self.tmdb_to_idx, "i2t": self.idx_to_tmdb}, f)
            logger.info(f"Built and saved ID mapper with {len(self.tmdb_to_idx)} mappings to {self.path}")
        except Exception as e:
            logger.error(f"Failed to save ID map to {self.path}: {e}")
    
    def to_idx(self, tmdb_id: int) -> int:
        return self.tmdb_to_idx.get(int(tmdb_id), -1)
    
    def to_tmdb(self, idx: int) -> int:
        return self.idx_to_tmdb.get(int(idx), -1)

id_mapper = MovieIDMapper()
