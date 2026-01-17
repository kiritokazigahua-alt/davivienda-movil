import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import TransfersPage from "@/pages/transfers";
import PaymentsPage from "@/pages/payments";
import HistoryPage from "@/pages/history";
import ProfilePage from "@/pages/profile";
import RecargasPage from "@/pages/recargas";
import RetirarPage from "@/pages/retirar";
import CertificadosPage from "@/pages/certificados";
import QrPage from "@/pages/qr";
import QrPaymentPage from "@/pages/qr-payment";
import AdminPage from "@/pages/admin";
import CardsPage from "@/pages/cards";
import NotFound from "@/pages/not-found";

// Layouts
import AppLayout from "@/layouts/AppLayout";

// Auth check
import { useStore } from "@/lib/store";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

function App() {
  const { isAuthenticated, setUser, user } = useStore((state) => state);
  const [location, setLocation] = useLocation();

  // Redirect logic
  useEffect(() => {
    // Get user information
    const currentUser = useStore.getState().user;
    const isUserAdmin = currentUser?.isAdmin === 1;
    
    if (isAuthenticated) {
      // Si estamos en la página de inicio de sesión o en una ruta no permitida para el tipo de usuario
      if (location === "/" || 
          (isUserAdmin && location !== "/admin") ||
          (!isUserAdmin && location === "/admin")) {
        
        // Redirigir a administrador a su panel específico
        if (isUserAdmin) {
          setLocation("/admin");
        } else {
          // Redirigir a usuarios normales a la página de inicio
          setLocation("/home");
        }
      }
    }
    // Redirect to login if not authenticated and not on login page
    else if (!isAuthenticated && location !== "/") {
      setLocation("/");
    }
  }, [isAuthenticated, location, setLocation]);

  // Get user data if authenticated
  const { data: userData, error: userError } = useQuery({
    queryKey: ['/api/user'],
    enabled: isAuthenticated,
  });
  
  // Handle user data changes
  useEffect(() => {
    if (userData) {
      setUser(userData as any);
    }
  }, [userData, setUser]);
  
  // Error handling for user data
  useEffect(() => {
    if (userError && isAuthenticated) {
      // If fetching user data fails, we should log out
      useStore.getState().logout();
      setLocation("/");
    }
  }, [userError, isAuthenticated, setLocation]);

  // Verificar si el usuario es administrador
  const isAdmin = user?.isAdmin === 1;
  
  return (
    <TooltipProvider>
      <Toaster />
      <Switch>
        <Route path="/" component={LoginPage} />
        
        {/* Si el usuario es administrador, mostrar el panel de administración */}
        {isAuthenticated && isAdmin && (
          <>
            <Route path="/admin" component={AdminPage} />
            <Route path="/home" component={AdminPage} />
            {/* Capturar todas las rutas posibles y mostrar el panel de administración */}
            <Route path="/transfers" component={AdminPage} />
            <Route path="/payments" component={AdminPage} />
            <Route path="/history" component={AdminPage} />
            <Route path="/profile" component={AdminPage} />
            <Route path="/recargas" component={AdminPage} />
            <Route path="/retirar" component={AdminPage} />
            <Route path="/certificados" component={AdminPage} />
            <Route path="/qr" component={AdminPage} />
            <Route path="/qr-payment" component={AdminPage} />
            <Route path="/cards" component={AdminPage} />
          </>
        )}
        
        {/* Rutas normales solo para usuarios no administradores */}
        {isAuthenticated && !isAdmin && (
          <Route path="/home">
            <AppLayout>
              <HomePage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/transfers">
            <AppLayout>
              <TransfersPage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/payments">
            <AppLayout>
              <PaymentsPage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/history">
            <AppLayout>
              <HistoryPage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/profile">
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/recargas">
            <AppLayout>
              <RecargasPage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/retirar">
            <AppLayout>
              <RetirarPage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/certificados">
            <AppLayout>
              <CertificadosPage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/qr">
            <AppLayout>
              <QrPage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/qr-payment">
            <AppLayout>
              <QrPaymentPage />
            </AppLayout>
          </Route>
        )}
        
        {isAuthenticated && !isAdmin && (
          <Route path="/cards">
            <AppLayout>
              <CardsPage />
            </AppLayout>
          </Route>
        )}
        
        <Route component={NotFound} />
      </Switch>
    </TooltipProvider>
  );
}

export default App;
