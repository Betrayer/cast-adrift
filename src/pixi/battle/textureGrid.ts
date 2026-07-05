import { Container, Sprite } from "pixi.js";
import type { Application } from "pixi.js";
import { schools } from "@/data/schools";
import { dieTexture, releaseDieTextures } from "@/pixi/textures";
import type { School } from "@/types/content";

export const mountTextureGrid = (app: Application): (() => void) => {
  const root = new Container();
  const size = 52;
  const pad = 8;
  const schoolIds = Object.keys(schools) as School[];
  schoolIds.forEach((school, row) => {
    for (let value = 1; value <= 8; value += 1) {
      const sprite = new Sprite(
        dieTexture(app, { school, tier: 8, value, size }),
      );
      sprite.position.set(
        pad + (value - 1) * (size + pad),
        pad + row * (size + pad),
      );
      root.addChild(sprite);
    }
  });
  app.stage.addChild(root);
  return () => {
    root.destroy({ children: true });
    releaseDieTextures(app);
  };
};
