import { WorkerEntrypoint } from 'cloudflare:workers'
import { Env } from '../../../src/types'

export default class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
  static Resources = {
    /**
     * A URL of a nearby surf camera, to check for local surf conditions
     * */
    local_surf_cam_url: 'https://www.swellnet.com/surfcams/noosa-heads',
    /**
     * This is my email address, to be used whenever I ask to "email me" something.
     * @return {string}
     * */
    my_email_address: (env: Env) => env.MY_EMAIL,
  }
}
