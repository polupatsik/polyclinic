import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './utils/ToastContext';
import Landing from './pages/Landing';
import Patient from './pages/Patient';
import Doctor  from './pages/Doctor';
import Admin   from './pages/Admin';
import { Forgot, ResetPassword, VerifyEmail } from './pages/Auth';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"               element={<Landing/>}/>
          <Route path="/patient"        element={<Patient/>}/>
          <Route path="/doctor"         element={<Doctor/>}/>
          <Route path="/admin"          element={<Admin/>}/>
          <Route path="/forgot"         element={<Forgot/>}/>
          <Route path="/reset-password" element={<ResetPassword/>}/>
          <Route path="/verify-email"   element={<VerifyEmail/>}/>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
