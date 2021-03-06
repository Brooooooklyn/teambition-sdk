import 'rxjs/add/observable/defer'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/publishReplay'
import 'rxjs/add/operator/finally'
import { Observable } from 'rxjs/Observable'
import { Http, HttpResponseWithHeaders, getHttpWithResponseHeaders } from './Net/Http'
import { UserMe } from './schemas/UserMe'
import { forEach, isEmptyObject } from './utils/index'

export interface SDKFetchOptions {
  includeHeaders?: boolean,
  wrapped?: boolean
}

export class SDKFetch {

  constructor(
    private apiHost: string = 'https://www.teambition.com/api',
    private token: string = '',
    private headers = {},
    private options = {}
  ) {}

  static FetchStack = new Map<string, Observable<any>>()
  static fetchTail: string | undefined | 0

  get<T>(path: string, query: any, options: { wrapped: true, includeHeaders: true }): Http<HttpResponseWithHeaders<T>>
  get<T>(path: string, query: any, options: { wrapped: true, includeHeaders: false }): Http<T>
  get<T>(path: string, query: any, options: { wrapped: false, includeHeaders: true }): Observable<HttpResponseWithHeaders<T>>
  get<T>(path: string, query: any, options: { wrapped: true }): Http<T>
  get<T>(path: string, query: any, options: { includeHeaders: true }): Observable<HttpResponseWithHeaders<T>>
  get<T>(path: string, query?: any, options?: SDKFetchOptions): Observable<T>
  get<T>(path: string, query?: any, options: SDKFetchOptions = {}) {
    const url = this.urlWithPath(path)
    const urlWithQuery = query ? this._buildQuery(url, query) : url
    const http = options.includeHeaders ? getHttpWithResponseHeaders<T>() : new Http<T>()
    let dist: Observable<T> | Observable<HttpResponseWithHeaders<T>>

    this.setOpts(http)

    if (!SDKFetch.FetchStack.has(urlWithQuery)) {
      const tail = SDKFetch.fetchTail || Date.now()
      const urlWithTail = query && !isEmptyObject(query)
        ? `${ urlWithQuery }&_=${ tail }`
        : `${ urlWithQuery }?_=${ tail }`
      dist = Observable.defer(() => http.setUrl(urlWithTail).get()
        .send()
        .publishReplay<any>(1)
        .refCount()
      )
        .finally(() => {
          SDKFetch.FetchStack.delete(urlWithQuery)
        })

      SDKFetch.FetchStack.set(urlWithQuery, dist)
    }

    dist = SDKFetch.FetchStack.get(urlWithQuery)!

    if (options.wrapped) {
      http['request'] = dist
      return http
    } else {
      return dist
    }
  }

  private urlWithPath(path: string): string {
    return `${this.apiHost}/${path}`
  }

  post<T>(path: string, body: any, options: { wrapped: true, includeHeaders: true }): Http<HttpResponseWithHeaders<T>>
  post<T>(path: string, body: any, options: { wrapped: true, includeHeaders: false }): Http<T>
  post<T>(path: string, body: any, options: { wrapped: false, includeHeaders: true }): Observable<HttpResponseWithHeaders<T>>
  post<T>(path: string, body: any, options: { wrapped: true }): Http<T>
  post<T>(path: string, body: any, options: { includeHeaders: true }): Observable<HttpResponseWithHeaders<T>>
  post<T>(path: string, body?: any, options?: SDKFetchOptions): Observable<T>
  post<T>(path: string, body?: any, options: SDKFetchOptions = {}) {
    const http = options.includeHeaders ? getHttpWithResponseHeaders<T>() : new Http<T>()

    http.setUrl(this.urlWithPath(path))
    this.setOpts(http).post(body)

    return options.wrapped ? http : http['request']
  }

  put<T>(path: string, body: any, options: { wrapped: true, includeHeaders: true }): Http<HttpResponseWithHeaders<T>>
  put<T>(path: string, body: any, options: { wrapped: true, includeHeaders: false }): Http<T>
  put<T>(path: string, body: any, options: { wrapped: false, includeHeaders: true }): Observable<HttpResponseWithHeaders<T>>
  put<T>(path: string, body: any, options: { includeHeaders: true }): Observable<HttpResponseWithHeaders<T>>
  put<T>(path: string, body: any, options: { wrapped: true }): Http<T>
  put<T>(path: string, body?: any, options?: SDKFetchOptions): Observable<T>
  put<T>(path: string, body?: any, options: SDKFetchOptions = {}) {
    const http = options.includeHeaders ? getHttpWithResponseHeaders<T>() : new Http<T>()

    http.setUrl(this.urlWithPath(path))
    this.setOpts(http).put(body)

    return options.wrapped ? http : http['request']
  }

  delete<T>(path: string, body: any, options: { wrapped: true, includeHeaders: true }): Http<HttpResponseWithHeaders<T>>
  delete<T>(path: string, body: any, options: { wrapped: true, includeHeaders: false }): Http<T>
  delete<T>(path: string, body: any, options: { wrapped: false, includeHeaders: true }): Observable<HttpResponseWithHeaders<T>>
  delete<T>(path: string, body: any, options: { includeHeaders: true }): Observable<HttpResponseWithHeaders<T>>
  delete<T>(path: string, body: any, options: { wrapped: true }): Http<T>
  delete<T>(path: string, body?: any, options?: SDKFetchOptions): Observable<T>
  delete<T>(path: string, body?: any, options: SDKFetchOptions = {}) {
    const http = options.includeHeaders ? getHttpWithResponseHeaders<T>() : new Http<T>()

    http.setUrl(this.urlWithPath(path))
    this.setOpts(http).delete(body)

    return options.wrapped ? http : http['request']
  }

  setAPIHost(host: string) {
    this.apiHost = host
  }

  getAPIHost() {
    return this.apiHost
  }

  setHeaders(headers: {}) {
    this.headers = headers
  }

  setToken(token: string) {
    this.token = token
  }

  setOptions(options: {}) {
    this.options = options
  }

  private setOpts<T>(http: Http<T | HttpResponseWithHeaders<T>>) {
    if (Object.keys(this.headers).length > 0) {
      http.setHeaders(this.headers)
    }
    if (this.token) {
      http.setToken(this.token)
    }
    if (Object.keys(this.options).length > 0) {
      http.setOpts(this.options)
    }
    return http
  }

  private _buildQuery(url: string, query: any) {
    if (typeof query !== 'object' || !query) {
      return url
    }
    const result: string[] = []
    forEach(query, (val: any, key: string) => {
      if (key === '_') {
        console.warn('query should not contain key \'_\', it will be ignored')
        return
      }
      if (Array.isArray(val)) {
        (<any[]>val).forEach(_val => {
          if (typeof _val !== 'undefined') {
            result.push(`${key}=${_val}`)
          }
        })
      } else {
        if (typeof val !== 'undefined') {
          result.push(`${key}=${val}`)
        }
      }
    })
    let _query: string
    if (url.indexOf('?') !== -1) {
      _query = result.length ? '&' + result.join('&') : ''
    } else {
      _query = result.length ? '?' + result.join('&') : ''
    }
    return url + _query
  }

  getUserMe() {
    return this.get<UserMe>('users/me')
  }
}
