import { useMutation } from "@tanstack/react-query";
import { register } from "../api/authApi";

export function useRegister() {
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      console.log("Register successfully:", data);
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