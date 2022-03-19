# @pmndrs/cannon-worker-api

Web worker api for [cannon-es](https://github.com/pmndrs/cannon-es). Currently used in `@react-three/cannon`.

```ts
import { World } from '@pmndrs/cannon-worker-api';

const world = new World();

const box = new Box({
  shape: [1, 1, 1],
  position: [0, 2, 0],
});

world.addBody(box);

world.step(...);
```
