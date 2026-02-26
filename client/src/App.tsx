import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ComponentType } from "react";

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
import PaymentSuccessPage from "@/pages/payment-success";
import PaymentCancelPage from "@/pages/payment-cancel";
import NotFound from "@/pages/not-found";

import AppLayout from "@/layouts/AppLayout";
import { IdleTimeout } from "@/components/IdleTimeout";

import { useStore } from "@/lib/store";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const userRoutes: { path: string; component: ComponentType }[] = [
  { path: "/home", component: HomePage },
  { path: "/transfers", component: TransfersPage },
  { path: "/payments", component: PaymentsPage },
  { path: "/history", component: HistoryPage },
  { path: "/profile", component: ProfilePage },
  { path: "/recargas", component: RecargasPage },
  { path: "/retirar", component: RetirarPage },
  { path: "/certificados", component: CertificadosPage },
  { path: "/qr", component: QrPage },
  { path: "/qr-payment", component: QrPaymentPage },
  { path: "/cards", component: CardsPage },
];

const adminPaths = ["/admin", ...userRoutes.map(r => r.path)];

function App() {
  const { isAuthenticated, setUser, user } = useStore((state) => state);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const currentUser = useStore.getState().user;
    const isUserAdmin = currentUser?.isAdmin === 1;
    
    if (isAuthenticated) {
      if (location === "/" || 
          (isUserAdmin && location !== "/admin") ||
          (!isUserAdmin && location === "/admin")) {
        setLocation(isUserAdmin ? "/admin" : "/home");
      }
    } else if (location !== "/") {
      setLocation("/");
    }
  }, [isAuthenticated, location, setLocation]);

  const { data: userData, error: userError } = useQuery({
    queryKey: ['/api/user'],
    enabled: isAuthenticated,
  });
  
  useEffect(() => {
    if (userData) {
      setUser(userData as any);
    }
  }, [userData, setUser]);
  
  useEffect(() => {
    if (userError && isAuthenticated) {
      useStore.getState().logout();
      setLocation("/");
    }
  }, [userError, isAuthenticated, setLocation]);

  const isAdmin = user?.isAdmin === 1;
  
  return (
    <TooltipProvider>
      <Toaster />
      <IdleTimeout />
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/payment/success" component={PaymentSuccessPage} />
        <Route path="/payment/cancel" component={PaymentCancelPage} />
        
        {isAuthenticated && isAdmin && adminPaths.map((p) => (
          <Route key={p} path={p} component={AdminPage} />
        ))}
        
        {isAuthenticated && !isAdmin && userRoutes.map(({ path, component: Page }) => (
          <Route key={path} path={path}>
            <AppLayout>
              <Page />
            </AppLayout>
          </Route>
        ))}
        
        <Route component={NotFound} />
      </Switch>
    </TooltipProvider>
  );
}

export default App;
