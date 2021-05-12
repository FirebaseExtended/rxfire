/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { resolve, dirname, relative, join } from 'path';
import resolveModule from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { uglify } from 'rollup-plugin-uglify';
import { peerDependencies, dependencies } from './package.json';
import { sync as globSync } from 'glob';
import { readFileSync } from 'fs';
import generatePackageJson from 'rollup-plugin-generate-package-json';

const packageJsonPaths = globSync('**/package.json', { ignore: ['node_modules/**', 'dist/**', 'test/**'] });
const packages = packageJsonPaths.reduce((acc, path) => {
  const pkg = JSON.parse(readFileSync(path, { encoding: 'utf-8'} ));
  const component = dirname(path);
  acc[component] = pkg;
  return acc;
}, {});

const plugins = [resolveModule(), commonjs()];

const external = [
  ...Object.keys({ ...peerDependencies, ...dependencies }),
  'rxjs/operators'
];

const globals = {
  //rxfire: GLOBAL_NAME,
  rxjs: 'rxjs',
  tslib: 'tslib',
  ...Object.values(packages).reduce((acc, {name}) => (acc[name] = name.replace(/\//g, '.'), acc), {}),
  'rxjs/operators': 'rxjs.operators',
};

export default Object.keys(packages)
  .map(component => {
    const baseContents = packages[component];
    const { name, browser, main, module, typings } = baseContents;
    // rewrite the paths for dist folder
    // TODO error if any of these don't match convention
    const outputFolder = join('dist', component);
    baseContents.browser = relative(outputFolder, resolve(component, browser));
    baseContents.main = relative(outputFolder, resolve(component, main));
    baseContents.module = relative(outputFolder, resolve(component, module));
    baseContents.typings = relative(outputFolder, resolve(component, typings));
    if (component === '.') {
      baseContents.scripts = {};
      delete baseContents.files;
      baseContents.devDependencies = {};
      baseContents.private = false;
    }
    return [
      {
        input: `${component}/index.ts`,
        output: [
          {
            file: resolve(component, main),
            format: 'cjs',
            sourcemap: true
          },
          {
            file: resolve(component, module),
            format: 'es',
            sourcemap: true
          }
        ],
        plugins: [
          ...plugins,
          typescript(),
          generatePackageJson({ outputFolder, baseContents }),
        ],
        external
      },
      {
        input: `${component}/index.ts`,
        output: {
          file: `dist/${name.replace(/\//g, '-')}.js`,
          format: 'iife',
          sourcemap: true,
          extend: true,
          name: globals[baseContents.name],
          globals,
        },
        plugins: [
          ...plugins,
          typescript(),
          uglify(),
        ],
        external
      },
    ];
  }).flat();