import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-3xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
        </div>

        {/* 404 */}
        <h1 className="text-8xl font-black text-primary mb-2 tracking-tighter">404</h1>
        <p className="text-2xl font-bold text-foreground mb-2">Page Not Found</p>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          The page <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{location.pathname}</span> doesn't exist.
        </p>

        {/* Action */}
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <Button asChild className="btn-saffron px-8 h-12 rounded-xl text-base font-bold shadow-lg">
            <a href="/">
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </a>
          </Button>
        </motion.div>

        {/* Decorative */}
        <div className="mt-12 text-xs text-muted-foreground/50 font-medium tracking-wider uppercase">
          Aapno Rasto — Government of Gujarat
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
