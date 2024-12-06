/**
 * This file provides the public HTTP handler to be able to deploy this worker.
 *
 * When being deployed, the following line is injected at the beginning of this file:
 *
 * const BINDINGS = {
 * 		"<entrypoint-name>":{
 * 			"binding":"<binding-name>",
 * 			"service":"<this-worker-name>",
 * 			"entrypoint":"<entrypoint-name>"
 * 		},
 * 	  ...
 * 	}
 * */

export * from '../src/index'

export default {
  async fetch(request: Request, env: Env) {},
}
