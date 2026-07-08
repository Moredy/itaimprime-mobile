import * as SecureStore from "expo-secure-store";

const SESSION_COOKIE_KEY = "agendamento-medico.session-cookie";

export const sessionStore = {
  getCookie: () => SecureStore.getItemAsync(SESSION_COOKIE_KEY),
  setCookie: (cookie: string) => SecureStore.setItemAsync(SESSION_COOKIE_KEY, cookie),
  clear: () => SecureStore.deleteItemAsync(SESSION_COOKIE_KEY),
};
