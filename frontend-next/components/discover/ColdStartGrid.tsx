import { Movie } from "../../lib/types";
import { MovieCard } from "../movie/MovieCard";

export function ColdStartGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {movies.map((movie) => (
        <MovieCard key={movie.tmdb_id} movie={movie} />
      ))}
    </div>
  );
}
