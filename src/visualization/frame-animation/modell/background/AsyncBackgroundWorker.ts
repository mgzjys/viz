import {
  AsyncMethodCall,
  INITIALIZE,
  MethodCall,
  AsyncMethodResult,
  TYPE_RESULT,
  MethodResult,
  TYPE_ERROR,
  AsyncError,
} from './Contracts'

/*  make sure typescript compiler knows that the global context is a worker context.
    also see: https://github.com/Microsoft/TypeScript/issues/582
    and: https://github.com/Microsoft/TypeScript/issues/20595
*/
const WorkerContext: Worker = self as any

export default abstract class AsyncBackgroundWorker {
  private handleMessageDelegate: EventListener
  private isInitialized = false

  constructor() {
    this.handleMessageDelegate = e => this.handleMessage(e as MessageEvent)
    addEventListener('message', this.handleMessageDelegate)
  }

  public abstract handleInitialize(call: MethodCall): void
  public abstract async handleMethodCall(call: MethodCall): Promise<MethodResult>

  private async handleMessage(e: MessageEvent): Promise<void> {
    const message = e.data as AsyncMethodCall

    if (!this.isValidMessage(message)) console.error('invalid message')

    if (message.call.method === INITIALIZE) {
      this.handleInitialize(message.call)
      this.postResult(message.id, { data: {} })
      this.isInitialized = true
      return
    }

    if (!this.isInitialized) {
      this.postError(message.id, 'worker was not initialized')
      return
    }

    try {
      const result = await this.handleMethodCall(message.call)
      this.postResult(message.id, result)
    } catch (error) {
      this.postError(message.id, error.message)
    }
  }

  private postResult(id: string, methodResult: MethodResult) {
    const asyncResult: AsyncMethodResult = {
      id: id,
      type: TYPE_RESULT,
      result: methodResult.data,
    }
    WorkerContext.postMessage(asyncResult, methodResult.transferrables)
  }

  private postError(id: string, error: any) {
    const asyncError: AsyncError = {
      id: id,
      type: TYPE_ERROR,
      error: error,
    }
    WorkerContext.postMessage(asyncError)
  }

  private isValidMessage(message?: AsyncMethodCall) {
    return message && message.call.method && message.call.parameters && message.id
  }
}
