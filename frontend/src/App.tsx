import { Routes, Route, Navigate } from 'react-router-dom';
import { StorefrontScreen } from './components/StorefrontScreen';
import { PaymentScreen } from './components/PaymentScreen';

function App() {
  return (
    <div className="bg-gray-900 text-white font-sans min-h-screen">
      <Routes>
        <Route path="/" element={<Navigate to="/shop" replace />} />
        <Route path="/shop" element={<StorefrontScreen />} />
        <Route path="/checkout" element={<PaymentScreen />} />
      </Routes>
    </div>
  );
}

export default App;