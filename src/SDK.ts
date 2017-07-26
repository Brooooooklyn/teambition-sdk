import 'rxjs/add/operator/concatMap'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/mapTo'
import { Observable } from 'rxjs/Observable'
import {
  Database
} from 'reactivedb'
import { Net } from './Net'

import { forEach } from './utils'
import { SDKFetch } from './SDKFetch'
import { SocketClient, SocketClientOptions } from './sockets/SocketClient'
import { SchemaColl } from './utils/internalTypes'

export const schemas: SchemaColl = []

export { CacheStrategy } from './Net'

export interface SDKOptions {
  pushService: SocketClientOptions,
}

export class SDK {
  net = new Net(schemas)
  fetch = new SDKFetch
  public socketClient: SocketClient
  database: Database

  constructor(options: SDKOptions) {
    this.socketClient = new SocketClient(this.fetch, this.net, schemas, options.pushService)
  }

  lift: typeof Net.prototype.lift = (ApiResult: any): any => {
    return this.net.lift(ApiResult)
  }

  initReactiveDB (db: Database): Observable<void[]> {
    this.database = db
    forEach(schemas, d => {
      this.database.defineSchema(d.name, d.schema)
    })
    this.database.connect()

    this.socketClient.initReactiveDB(this.database)
    return this.net.persist(this.database)
  }

}
