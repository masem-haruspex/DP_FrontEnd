import { useMutation } from "@tanstack/react-query";
import { login } from "../api/authApi";

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      console.log("Login successfully:", data);
    },
    onError: (err: unknown) => {
      if (err && typeof err === "object" && "response" in err && err.response && typeof err.response === "object" && "data" in err.response) {
        console.error("Login failed:", err.response.data);
      } else if (err instanceof Error) {
        console.error("Login failed:", err.message);
      } else {
        console.error("Login failed:", err);
      }
    },
  });
}