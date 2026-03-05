import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorLogger";
import type { AuthRole } from "@/lib/sendIdTokenToBackend";

interface EmailSignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EmailSignupDialog = ({ open, onOpenChange, onSuccess }: EmailSignupDialogProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AuthRole>("parent");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("모든 항목을 입력해주세요");
      return;
    }
    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        data: { role: selectedRole },
      });
      if (error) {
        toast.error(error.message || "회원가입에 실패했습니다");
        return;
      }
      if (data?.user) {
        toast.success("회원가입이 완료되었습니다. 로그인해주세요.");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      logError("email-signup-dialog", error);
      toast.error("회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">회원가입</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="비밀번호 재입력"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>
          <Button
            onClick={handleSignup}
            disabled={loading}
            className="w-full h-14 text-base"
          >
            {loading ? "처리 중..." : "회원가입"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailSignupDialog;
