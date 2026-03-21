import sys

filepath = r'c:\Users\yash6\OneDrive\Desktop\rs\movie-recommendation-system\frontend\src\pages\MovieDetails.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = [
    '              {/* Cast */}\n',
    '              {movie.cast && movie.cast.length > 0 && (\n',
    '                <motion.div\n',
    '                  initial={{ opacity: 0, y: 20 }}\n',
    '                  animate={{ opacity: 1, y: 0 }}\n',
    '                  transition={{ delay: 0.3 }}\n',
    '                >\n',
    '                  <h2 className="text-xl font-bold text-white mb-4 border-l-4 border-primary pl-4">Top Cast</h2>\n',
    '                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">\n',
    '                    {movie.cast.map((actor, i) => (\n'
]

lines = lines[:217] + new_lines + lines[239:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
