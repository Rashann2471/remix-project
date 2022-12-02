import { allChangedButNotStagedFiles, getFilesByStatus, getFilesWithNotModifiedStatus } from "../lib/fileHelpers"
import { defaultGitState, gitState } from "../types"

interface Action {
    type: string
    payload: any
}

export const gitReducer = (state: gitState = defaultGitState, action: Action) => {
    console.log(action, state)
    switch (action.type) {
       
        case 'FILE_STATUS':
            return {
                ...state,
                fileStatusResult: action.payload,
                staged: getFilesByStatus("staged", action.payload),
                modified: getFilesByStatus("modified", action.payload),
                untracked: getFilesByStatus("untracked", action.payload),
                deleted: getFilesByStatus("deleted", action.payload),
                allchangesnotstaged: allChangedButNotStagedFiles(action.payload)
            }

        case 'SET_CAN_USE_APP':
            return {
                ...state,
                canUseApp: action.payload
            }
        case 'SET_REPO_NAME':
            return {
                ...state,
                repoName: action.payload
            }
        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload
            }

    }
}