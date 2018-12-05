import { JsogService, JsonProperty } from 'jsog-typescript'
import { ContentType, HeaderKeys, Method } from '@/communication/Constants'
import AuthenticatedRequest from '@/auth/AuthenticatedRequest'
import Config from '@/config/Config'
import { Project, Visualization, Tag, Permission } from '@/entities/Entities'
import AuthenticationStore from '@/auth/AuthenticationStore'

export interface CreateVisualizationRequest {
  projectId?: string
  typeKey?: string
  inputFiles: { [key: string]: string } // use this notation since Map-type is not yet supported by (de)serialization
  inputParameters: { [key: string]: string } // as with inputFiles
}

export interface CreateTagRequest {
  name: string
  type: string
}

export default class FileAPI {
  private PROJECT: string = Config.fileServer + '/projects'
  private FILE: string = Config.fileServer + '/file/'
  private FILE_UPLOAD: string = Config.fileServer + '/file/upload/'
  private VISUALIZATION: string = 'visualizations/'
  private VISUALIZATION_TYPE: string = Config.fileServer + '/visualization-types/'

  private jsogService = new JsogService()
  private authenticatedRequester: AuthenticatedRequest

  constructor(authStore: AuthenticationStore) {
    this.authenticatedRequester = new AuthenticatedRequest(authStore)
  }

  public async fetchAllPersonalProjects(): Promise<Project[]> {
    return await this.request<Project[]>(this.PROJECT, this.corsRequestOptions())
  }

  public async fetchProject(projectId: string): Promise<Project> {
    return await this.request<Project>(this.PROJECT + '/' + projectId, this.corsRequestOptions())
  }

  public async fetchVisualization(projectId: string, visualizationId: string): Promise<Visualization> {
    return await this.request<Visualization>(
      this.PROJECT + '/' + projectId + '/' + this.VISUALIZATION + visualizationId,
      this.corsRequestOptions()
    )
  }

  public async fetchVizualizationsForProject(projectId: string): Promise<Visualization[]> {
    return await this.request<Visualization[]>(
      `${this.PROJECT}/${projectId}/${this.VISUALIZATION}`,
      this.corsRequestOptions()
    )
  }

  public async createProject(projectName: string): Promise<Project> {
    const options = this.postRequestOptions({ name: projectName })
    return await this.request<Project>(this.PROJECT, options)
  }

  public async patchProject(projectId: string, newProjectName: string) {
    const options = this.postRequestOptions({ name: newProjectName })
    options.method = Method.PATCH
    return await this.request<void>(`${this.PROJECT}/${projectId}`, options)
  }

  public async createVisualization(request: CreateVisualizationRequest): Promise<Visualization> {
    const options = this.postRequestOptions(request)
    return await this.request<Visualization>(`${this.PROJECT}/${request.projectId}/${this.VISUALIZATION}`, options)
  }

  public async createTag(request: CreateTagRequest, projectId: string) {
    const options = this.postRequestOptions(request)
    return await this.request<Tag>(`${this.PROJECT}/${projectId}/tags`, options)
  }

  public async deleteVisualization(projectId: string, vizId: string) {
    const options: RequestInit = {
      mode: 'cors',
      method: Method.DELETE,
    }
    return await this.request(`${this.PROJECT}/${projectId}/${this.VISUALIZATION}/${vizId}`, options)
  }

  public async uploadFiles(files: File[], project: Project): Promise<Project> {
    const formData = new FormData()
    for (const file of files) {
      formData.append(file.name, file)
    }

    const options: RequestInit = {
      method: Method.POST,
      mode: 'cors',
      body: formData,
    }

    const url = `${this.PROJECT}/${project.id}/files`
    return await this.request<Project>(url, options)
  }

  public async downloadFile(fileId: string, projectId: string): Promise<Blob> {
    const url = `${this.PROJECT}/${projectId}/files/${fileId}`
    const result = await this.authenticatedRequester.fetch(url, this.corsRequestOptions())

    if (result.ok) {
      const file = await result.blob()
      console.log('downloaded blop with size: ' + file.size)
      return file
    } else {
      throw await this.generateError(result)
    }
  }

  public async deleteFile(fileId: string, project: Project): Promise<void> {
    const options = this.corsRequestOptions()
    options.method = Method.DELETE

    return await this.request<void>(`${this.PROJECT}/${project.id}/files/${fileId}`, options)
  }

  public async addPermission(projectId: string, userAuthId: string, type: string) {
    const options = this.postRequestOptions({ resourceId: projectId, userAuthId: userAuthId, type: type })
    return await this.request<Permission>(`${this.PROJECT}/${projectId}/permissions`, options)
  }

  public async removePermission(projectId: string, userAuthId: string) {
    const options = this.corsRequestOptions()
    options.method = Method.DELETE
    return await this.request<void>(`${this.PROJECT}/${projectId}/permissions?userAuthId=${userAuthId}`, options)
  }

  private postRequestOptions(body: any): RequestInit {
    const headers = new Headers()
    headers.append(HeaderKeys.CONTENT_TYPE, ContentType.APPLICATION_JSON)
    return {
      method: Method.POST,
      mode: 'cors',
      headers: headers,
      body: JSON.stringify(body),
    }
  }

  private corsRequestOptions(): RequestInit {
    return {
      mode: 'cors',
    }
  }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const result = await this.authenticatedRequester.fetch(endpoint, options)
    if (result.ok) {
      if (result.status === 204) {
        // if result is no-content, there is nothing to parse
        // make the compiler happy about return types.
        const promise = Promise.resolve() as unknown
        return promise as Promise<T>
      } else {
        const message = await result.json()
        return this.jsogService.deserialize(message) as any
      }
    } else {
      throw await this.generateError(result)
    }
  }

  private async generateError(response: Response): Promise<Error> {
    const error = await response.json()
    console.error(error)
    return new Error(error.error_description)
  }
}
