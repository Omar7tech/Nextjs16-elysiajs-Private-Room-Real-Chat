
import { treaty } from '@elysiajs/eden'
import { app } from '../app/api/[[...slugs]]/route'

// .api to enter /api prefix
export const client =
  // window is only defined in browser
  typeof window !== 'undefined'
    ? treaty<typeof app>('localhost:3000').api
    : treaty(app).api

