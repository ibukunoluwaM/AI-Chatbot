import React, { useState } from 'react';

function Data() {
    const [thread, setThread] = useState(()=> {
        const id = Date.now().toString();
        return {
            id,
            messages: []
        }
    })
  return (
    <div>Data</div>
  )
}

export default Data