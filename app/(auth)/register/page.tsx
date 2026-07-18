import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Create account" };
export default async function RegisterPage() {
  if ((await auth())?.user) redirect("/workspace");
  return (
    <Card>
      <CardHeader className="pb-5">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Set up a secure AI Dashboard workspace for your team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
