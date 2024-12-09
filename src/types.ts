export interface Env {
  /* Bindings */
  EMAIL: SendEmail

  /* Vars */
  EMAIL_FROM: string
  MY_EMAIL: string

  /* Secrets */
  SHARED_SECRET: string

  MYBROWSER: Fetcher

  AI: Ai
}
