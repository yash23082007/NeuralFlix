import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import SearchResults from './pages/SearchResults';
import GenrePage from './pages/GenrePage';
import SeriesPage from './pages/SeriesPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-textPrimary flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/genre/:genre" element={<GenrePage />} />
            <Route path="/series" element={<SeriesPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
