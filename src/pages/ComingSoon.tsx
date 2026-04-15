import { Card, CardContent } from "../components/ui/card";
import { Construction } from "lucide-react";

const ComingSoon = ({ title = "Coming Soon" }: { title?: string }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="shadow-card max-w-md w-full">
        <CardContent className="p-8 text-center">
          <Construction className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2">This feature is under development and will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
