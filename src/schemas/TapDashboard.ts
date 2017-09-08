import { RDBType, Relationship, SchemaDef } from 'reactivedb/interface'
import { schemas } from '../SDK'

import {
  UserId,
  ProjectId,
  TapChartId,
  TapDashboardId,
  ExecutorOrCreator,
  TapGenericFilterRequest as FilterRequest,
  TapGenericFilterResponse as FilterResponse
} from 'teambition-types'

import {
  TapChart
} from './TapChart'

export type TapCoordSize = 'small' | 'mid' | 'size'

export interface TapCoordination {
  _objectId: TapDashboardId | TapChartId,
  order?: number
  size?: TapCoordSize
}

export interface TapDashboard<T extends FilterRequest | FilterResponse> {
  _id: TapDashboardId

  _projectId: ProjectId

  _creatorId: UserId
  creator?: ExecutorOrCreator

  _ancestorId: TapDashboardId | null
  ancestor?: TapDashboard<FilterResponse>

  name: string
  coords: TapCoordination
  coverChart?: TapChart<FilterResponse>

  filter: T

  tapcharts: TapChart<FilterResponse>[]
  tapdashboards: TapDashboard<FilterResponse>[]
}

const schema: SchemaDef<TapDashboard<FilterRequest | FilterResponse>> = {
  _id: {
    type: RDBType.STRING,
    primaryKey: true
  },

  _projectId: {
    type: RDBType.STRING
  },

  _creatorId: {
    type: RDBType.STRING
  },
  creator: {
    type: Relationship.oneToOne,
    virtual: {
      name: 'Member',
      where: (memberTable: any) => ({
        _creatorId: memberTable._id
      })
    }
  },

  _ancestorId: {
    type: RDBType.STRING
  },
  ancestor: {
    type: Relationship.oneToOne,
    virtual: {
      name: 'TapDashboard',
      where: (tapDashboardTable: any) => ({
        _ancestorId: tapDashboardTable._id
      })
    }
  },

  name: {
    type: RDBType.STRING
  },
  coords: {
    type: RDBType.OBJECT
  },
  coverChart: {
    type: RDBType.OBJECT
  },

  filter: {
    type: RDBType.OBJECT
  },

  tapcharts: {
    type: Relationship.oneToMany,
    virtual: {
      name: 'TapChart',
      where: (tapChartTable: any) => ({
        _id: tapChartTable._tapdashboardId
      })
    }
  },
  tapdashboards: {
    type: Relationship.oneToMany,
    virtual: {
      name: 'TapDashboard',
      where: (tapDashboardTable: any) => ({
        _id: tapDashboardTable._ancestorId
      })
    }
  }
}

schemas.push({ schema, name: 'TapDashboard' })
