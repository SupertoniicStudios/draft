import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { BigBoard } from './pages/BigBoard';
import { Rosters } from './pages/Rosters';
import { Commish } from './pages/Commish';
import { DraftSetup } from './pages/DraftSetup';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full w-full" style={{ minHeight: '100vh' }}>Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<BigBoard />} />
          <Route path="rosters" element={<Rosters />} />
          <Route path="commish" element={<Commish />} />
          <Route path="setup" element={<DraftSetup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
