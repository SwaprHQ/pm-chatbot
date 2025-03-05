export interface SessionData {
  address?: string;
  userId?: string;
  nonce?: string;
  isLoggedIn: boolean;
}

export const sessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: "presagio",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};
