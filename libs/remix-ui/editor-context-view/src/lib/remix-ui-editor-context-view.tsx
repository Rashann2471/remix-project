import React, { useEffect, useState, useRef } from 'react' // eslint-disable-line
import { sourceMappingDecoder } from '@remix-project/remix-debug'

import './remix-ui-editor-context-view.css';

export type onContextListenerChangedListener = (nodes: Array<astNode>) => void

/* eslint-disable-next-line */
export interface RemixUiEditorContextViewProps {
  hide: boolean,
  gotoLine: (line: number, column: number) => void,
  openFile: (fileName: string) => void,
  getLastCompilationResult: () => any,
  offsetToLineColumn: (position: any, file: any, sources: any, asts: any) => any,
  getCurrentFileName: () => String
  onContextListenerChanged: (listener: onContextListenerChangedListener) => void
  referencesOf: (nodes: astNode) => Array<astNode>
  getActiveHighlights: () => Array<astNode>
  gasEstimation: (node: astNode) => gasEstimation
  declarationOf: (node: astNode) => astNode
}

function isDefinition (node: any) {
  return node.nodeType === 'ContractDefinition' ||
  node.nodeType === 'FunctionDefinition' ||
  node.nodeType === 'ModifierDefinition' ||
  node.nodeType === 'VariableDeclaration' ||
  node.nodeType === 'StructDefinition' ||
  node.nodeType === 'EventDefinition'
}

export type gasEstimationType = {
  executionCost: string,
  codeDepositCost: string
}

export type astNode = {
  name: string,
  id: number,
  children: Array<any>,
  typeDescriptions: any,
  nodeType: String,
  src: any,
  nodeId: any,
  position: any
}

type nullableAstNode = astNode | null

export function RemixUiEditorContextView(props: RemixUiEditorContextViewProps) {
  const nodesRef = useRef<Array<astNode>>([])
  /*
    gotoLineDisableRef is used to temporarily disable the update of the view. 
    e.g when the user ask the component to "gotoLine" we don't want to rerender the component (but just to put the mouse on the desired line)
  */
  const referencesRef = useRef([])
  const activeHighlightsRef = useRef([])
  const currentNodeRef = useRef(null as nullableAstNode)
  const gasEstimationRef = useRef({} as gasEstimationType)
  const gotoLineDisableRef = useRef(false)  
  const [nodesState, setNode] = useState<Array<astNode>>([])
  
  useEffect(() => {
    props.onContextListenerChanged(async (nodes: Array<astNode>) => {      
      if (gotoLineDisableRef.current) {
        gotoLineDisableRef.current = false
        return
      }
      nodesRef.current = nodes
      if (!props.hide && nodesRef.current && nodesRef.current.length) {
        currentNodeRef.current = nodesRef.current[nodesRef.current.length - 1]
        if (!isDefinition(currentNodeRef.current)) {
          currentNodeRef.current = await props.declarationOf(currentNodeRef.current)
        }
      }
      if (currentNodeRef.current) {
        referencesRef.current = await props.referencesOf(currentNodeRef.current)
        gasEstimationRef.current =  await props.gasEstimation(currentNodeRef.current)      
      }
      activeHighlightsRef.current = await props.getActiveHighlights()      
      setNode(nodes)
    })
  }, [])

  const _render = (node: nullableAstNode) => {
    if (!node) return (<div></div>)
    let references = referencesRef.current
    const type = node.typeDescriptions && node.typeDescriptions.typeString ? node.typeDescriptions.typeString : node.nodeType
    let referencesCount = `${references ? references.length : '0'} reference(s)`

    let ref = 0
    const nodes: Array<astNode> = activeHighlightsRef.current
        
     /*
     * show gas estimation
     */
    const gasEstimation = () => {
      if (node.nodeType === 'FunctionDefinition') {
        const result: gasEstimationType = gasEstimationRef.current
        const executionCost = ' Execution cost: ' + result.executionCost + ' gas'
        const codeDepositCost = 'Code deposit cost: ' + result.codeDepositCost + ' gas'
        const estimatedGas = result.codeDepositCost ? `${codeDepositCost}, ${executionCost}` : `${executionCost}`
        return (
          <div className="gasEstimation">
            <i className="fas fa-gas-pump gasStationIcon" title='Gas estimation'></i>
            <span>{estimatedGas}</span>
          </div>
        )
      } else {
        return (<div></div>)
      }
    }

    /*
     * onClick jump to ast node in the editor
     */
    const _jumpToInternal = async (position: any) => {
      const jumpToLine = async (fileName: string, lineColumn: any) => {
        if (fileName !== await props.getCurrentFileName()) {
          await props.openFile(fileName)
        }
        if (lineColumn.start && lineColumn.start.line && lineColumn.start.column) {
          gotoLineDisableRef.current = true     
          props.gotoLine(lineColumn.start.line, lineColumn.end.column + 1)
        }
      }
      const lastCompilationResult = await props.getLastCompilationResult()
      if (lastCompilationResult && lastCompilationResult.languageversion.indexOf('soljson') === 0 && lastCompilationResult.data) {
        const lineColumn = await props.offsetToLineColumn(
          position,
          position.file,
          lastCompilationResult.getSourceCode().sources,
          lastCompilationResult.getAsts())
        const filename = lastCompilationResult.getSourceName(position.file)
        // TODO: refactor with rendererAPI.errorClick
        jumpToLine(filename, lineColumn)
      }
    }

    const jumpTo = () => {
      if (node && node.src) {
        const position = sourceMappingDecoder.decode(node.src)
        if (position) {
          _jumpToInternal(position)
        }
      }
    }

    // JUMP BETWEEN REFERENCES
    const jump = (e: any) => {
      e.target.dataset.action === 'next' ? ref++ : ref--
      if (ref < 0) ref = nodes.length - 1
      if (ref >= nodes.length) ref = 0
      _jumpToInternal(nodes[ref].position)
    }

    return (
      <div className="line">{gasEstimation()}
        <div title={type} className="type">{type}</div>
        <div title={node.name} className="name mr-2">{node.name}</div>
        <i className="fas fa-share jump" data-action='gotoref' aria-hidden="true" onClick={jumpTo}></i>
        <span className="referencesnb">{referencesCount}</span>
        <i data-action='previous' className="fas fa-chevron-up jump" aria-hidden="true" onClick={jump}></i>
        <i data-action='next' className="fas fa-chevron-down jump" aria-hidden="true" onClick={jump}></i>
      </div>
    )
  }  

  return (
    !props.hide && <div className="container-context-view contextviewcontainer bg-light text-dark border-0 py-1">
      {_render(currentNodeRef.current)}
    </div>
  );
}

export default RemixUiEditorContextView
