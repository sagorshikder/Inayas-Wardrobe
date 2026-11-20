import { ErrorBoundary } from './components/ErrorBoundary';
import { DrawersAndModals } from './components/DrawersAndModals';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { StoreProvider, useStore } from './context/StoreContext';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { ContactPage } from './pages/ContactPage';
import { GalleryPage } from './pages/GalleryPage';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ShopPage } from './pages/ShopPage';
import { View3DPage } from './pages/View3DPage';

function StoreRouter() {
  const { route } = useStore();
  const pathname = (route.split('?')[0] || '/').replace(/\/+$/, '') || '/';

  switch (pathname) {
    case '/shop':
      return <ShopPage />;
    case '/product':
      return <ProductDetailPage />;
    case '/view3d':
      return <View3DPage />;
    case '/gallery':
      return <GalleryPage />;
    case '/about':
      return <AboutPage />;
    case '/contact':
      return <ContactPage />;
    case '/admin':
      return <AdminPage />;
    case '/':
    default:
      return <HomePage />;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <div className="min-h-screen flex flex-col overflow-x-clip bg-[#f7f2ea] dark:bg-[#17110d] text-[#22140d] dark:text-[#f1e6d8] transition-colors">
          <Header />
          <div className="flex-1">
            <StoreRouter />
          </div>
          <Footer />
          <DrawersAndModals />
        </div>
      </StoreProvider>
    </ErrorBoundary>
  );
}

export default App;
