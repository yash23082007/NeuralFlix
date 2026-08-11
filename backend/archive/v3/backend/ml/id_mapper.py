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
    
    def save(self):
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        try:
            with open(self.path, "w") as f:
                json.dump({
                    "t2i": {str(k): v for k, v in self.tmdb_to_idx.items()},
                    "i2t": {str(k): v for k, v in self.idx_to_tmdb.items()}
                }, f)
            logger.info(f"Saved ID mapper with {len(self.tmdb_to_idx)} mappings to {self.path}")
        except Exception as e:
            logger.error(f"Failed to save ID map to {self.path}: {e}")

    async def build_from_db(self, tmdb_ids: list = None):
        if tmdb_ids is None:
            from database import movies_collection
            cursor = movies_collection.find({}, {"tmdb_id": 1, "_id": 0})
            tmdb_ids = sorted([doc["tmdb_id"] async for doc in cursor if doc.get("tmdb_id")])
        
        self.tmdb_to_idx = {}
        self.idx_to_tmdb = {}
        for i, tmdb_id in enumerate(sorted(list(set(tmdb_ids)))):
            self.tmdb_to_idx[int(tmdb_id)] = i
            self.idx_to_tmdb[i] = int(tmdb_id)
        
        self.save()
        return len(self.tmdb_to_idx)
    
    def to_idx(self, tmdb_id: int) -> int:
        return self.tmdb_to_idx.get(int(tmdb_id), -1)
    
    def to_tmdb(self, idx: int) -> int:
        return self.idx_to_tmdb.get(int(idx), -1)

    def batch_to_idx(self, tmdb_ids: list) -> list:
        return [self.to_idx(t) for t in tmdb_ids if self.to_idx(t) >= 0]

    def batch_to_tmdb(self, indices: list) -> list:
        return [self.to_tmdb(i) for i in indices if self.to_tmdb(i) >= 0]

id_mapper = MovieIDMapper()
