export type    RotateTokenResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
    avatar?: string;
    walletBalance?: number;
  };
};
