from app.services.watchmode_service import watchmode_service

class AvailabilityService:
    async def get_availability(self, tmdb_id: int, region: str = "US"):
        return await watchmode_service.get_streaming_sources(tmdb_id, region)

availability_service = AvailabilityService()
