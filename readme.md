# yt-react

[![npm version](https://badge.fury.io/js/@ytoune%2Fyt-react.svg)](https://badge.fury.io/js/@ytoune%2Fyt-react)

reimplementing react as an exercise

## usage

```javascript
import { createRoot, useState } from '@ytoune/yt-react'
const App = () => {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}
createRoot(document.body).render(<App />)
```

## todo

- [x] jsx, jsxs
- [x] h (createElement)
- [x] render with simple html
- [x] rerender
- [x] useRef
- [x] useState
- [x] useEffect
- [x] useMemo
- [x] useReducer
- [x] createContext, useContext
- [x] array children, key prop
- [x] ref prop
- [x] useCallBack

- [ ] style
- [ ] dangerouslyuSetInnerHTML
