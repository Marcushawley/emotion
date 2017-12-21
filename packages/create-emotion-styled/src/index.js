// @flow
import { STYLES_KEY, TARGET_KEY } from 'emotion-utils'
import type { Emotion, Interpolation, Interpolations } from 'create-emotion'
import { channel, contextTypes } from '../../emotion-theming/src/utils'
import type { ElementType } from 'react'
import typeof ReactType from 'react'
import type { CreateStyled, StyledOptions } from './utils'
import {
  testOmitPropsOnComponent,
  testAlwaysTrue,
  testOmitPropsOnStringTag,
  omitAssign,
  setTheme
} from './utils'

function createEmotionStyled(emotion: Emotion, view: ReactType) {
  const createStyled: CreateStyled = (tag, options) => {
    if (process.env.NODE_ENV !== 'production') {
      if (tag === undefined) {
        throw new Error(
          'You are trying to create a styled element with an undefined component.\nYou may have forgotten to import it.'
        )
      }
    }
    let staticClassName
    let identifierName
    let stableClassName
    if (options !== undefined) {
      staticClassName = options.e
      identifierName = options.label
      stableClassName = options.target
    }
    const isReal = tag.__emotion_real === tag
    const baseTag =
      staticClassName === undefined
        ? (isReal && tag.__emotion_base) || tag
        : tag

    const omitFn =
      typeof baseTag === 'string' &&
      baseTag.charAt(0) === baseTag.charAt(0).toLowerCase()
        ? testOmitPropsOnStringTag
        : testOmitPropsOnComponent

    return (strings: Interpolation, ...interpolations: Interpolations) => {
      let styles = (isReal && tag[STYLES_KEY]) || []
      if (identifierName !== undefined) {
        styles = styles.concat(`label:${identifierName};`)
      }
      if (staticClassName === undefined) {
        if (strings == null || strings.raw === undefined) {
          styles = styles.concat(strings, interpolations)
        } else {
          styles = interpolations.reduce(
            (array, interp, i) => array.concat(interp, strings[i + 1]),
            styles.concat(strings[0])
          )
        }
      }

      class Styled extends view.Component<*, { theme: Object }> {
        unsubscribe: number
        mergedProps: Object
        static __emotion_real: any
        static __emotion_styles: Interpolations
        static __emotion_base: Styled
        static __emotion_target: string
        static withComponent: (ElementType, options?: StyledOptions) => any

        componentWillMount() {
          if (this.context[channel] !== undefined) {
            this.unsubscribe = this.context[channel].subscribe(
              setTheme.bind(this)
            )
          }
        }
        componentWillUnmount() {
          if (this.unsubscribe !== undefined) {
            this.context[channel].unsubscribe(this.unsubscribe)
          }
        }
        render() {
          const { props, state } = this
          this.mergedProps = omitAssign(testAlwaysTrue, {}, props, {
            theme: (state !== null && state.theme) || props.theme || {}
          })

          let className = ''
          let classInterpolations = []

          if (props.className) {
            if (staticClassName === undefined) {
              className += emotion.getRegisteredStyles(
                classInterpolations,
                props.className
              )
            } else {
              className += `${props.className} `
            }
          }
          if (staticClassName === undefined) {
            className += emotion.css.apply(
              this,
              styles.concat(classInterpolations)
            )
          } else {
            className += staticClassName
          }

          if (stableClassName !== undefined) {
            className += ` ${stableClassName}`
          }

          return view.createElement(
            baseTag,
            omitAssign(omitFn, {}, props, { className, ref: props.innerRef })
          )
        }
      }
      Styled.displayName =
        identifierName !== undefined
          ? identifierName
          : `Styled(${typeof baseTag === 'string'
              ? baseTag
              : baseTag.displayName || baseTag.name || 'Component'})`

      Styled.contextTypes = contextTypes
      Styled[STYLES_KEY] = styles
      Styled.__emotion_base = baseTag
      Styled.__emotion_real = Styled
      Styled[TARGET_KEY] = stableClassName

      Styled.withComponent = (
        nextTag: ElementType,
        nextOptions?: StyledOptions
      ) => {
        return createStyled(
          nextTag,
          nextOptions !== undefined
            ? // $FlowFixMe
              omitAssign(testAlwaysTrue, {}, options, nextOptions)
            : options
        )(styles)
      }

      return Styled
    }
  }
  return createStyled
}

export default createEmotionStyled
