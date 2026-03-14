import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import SearchResults from './pages/SearchResults';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-textPrimary">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/search" element={<SearchResults />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
