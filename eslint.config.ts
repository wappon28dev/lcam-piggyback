import antfu from "@antfu/eslint-config";

// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import { produce, setAutoFreeze } from "immer";
import { configTsTsx } from "./configs/eslint";

// NOTE: `antfu` 関数は, 与えられたオブジェクトに対して恐らく `jsx` プロパティーを追加するが,
// 設定群は, Immer によって凍結される. そのため, オブジェクトの自動凍結を無効にする必要がある.
setAutoFreeze(false);

export default antfu(
  produce(configTsTsx, (draft) => {
    // NOTE: `arktype` は configuration の関係で, `utils/arktype` から再エクスポートする.
    draft.stylistic.overrides["no-restricted-imports"][1] = {
      ...draft.stylistic.overrides["no-restricted-imports"][1],
      // @ts-expect-error: extra field
      paths: [{
        name: "arktype",
        importNames: ["type"],
        message: "This project uses `configure` fn with side-effect.  Instead of importing from `arktype`, import from `@/lib/utils/arktype`.",
      }],
    };
  }),
);
