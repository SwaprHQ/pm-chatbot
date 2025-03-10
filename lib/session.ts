import { SessionOptions } from "iron-session";

export interface SessionData {
  address?: string;
  userId?: string;
  nonce?: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: "presagio",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
};
