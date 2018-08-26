import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  INotebookTracker, NotebookPanel
} from '@jupyterlab/notebook';

import {
  IJupyterWidgetRegistry
} from '@jupyter-widgets/base';


import {
    ICommandPalette
} from '@jupyterlab/apputils';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  IRenderMimeRegistry,
} from '@jupyterlab/rendermime';

import '../style/index.css';

const WIDGET_MIMETYPE = 'application/vnd.jupyter.widget-view+json';


/**
 * Initialization data for the jupyterlab-supersave extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-supersave',
  autoStart: true,
  requires: [INotebookTracker, ICommandPalette, IRenderMimeRegistry, IJupyterWidgetRegistry],
  activate: (app: JupyterLab, notebooks: INotebookTracker, palette: ICommandPalette, mime: IRenderMimeRegistry) => {
    console.log('JupyterLab extension jupyterlab-supersave is activated!', mime);

    function getCurrent(args: ReadonlyJSONObject): NotebookPanel | null {
        const widget = notebooks.currentWidget;
        const activate = args['activate'] !== false;

        if (activate && widget) {
          app.shell.activateById(widget.id);
        }

        return widget;
    }

    function isEnabled(): boolean {
        return (
          notebooks.currentWidget !== null &&
          notebooks.currentWidget === app.shell.currentWidget
        );
    }

    app.commands.addCommand(CommandIDs.saveWithoutOutputs, {
        label: 'Save Notebook without Ouputs',
        execute: async (args) => {
          const current = getCurrent(args);

          if (current) {
            console.log('saving without output!');
            let toJSON = current.model.toJSON;
            let toJSONWithoutOutput = function() {
              let json = toJSON.call(current.model);
              json.cells.forEach((cell: any) => {
                if(cell.cell_type === 'code')
                  cell.outputs = [];
              })
              return json;
            }
            current.model.toJSON = toJSONWithoutOutput;
            await app.commands.execute('docmanager:save');
            current.model.toJSON = toJSON;
          }
        },
        isEnabled
    });
    palette.addItem({command:CommandIDs.saveWithoutOutputs, category:'Notebook Operations'})

    app.commands.addCommand(CommandIDs.saveWithWidgets, {
        label: 'Save Notebook with Jupyter-Widgets state',
        execute: async (args) => {
          const current = getCurrent(args);

          if (current) {
            const factory = current.rendermime.getFactory(WIDGET_MIMETYPE);

            const ren = factory.createRenderer({mimeType: 'dontcare'} as any);
            const mgr: any = (ren as any)._manager;
            const state: any = await mgr.get_state();


            let toJSON = current.model.toJSON;
            let toJSONWithoutOutput = function() {
              let json = toJSON.call(current.model);
              json.metadata.widgets = {"application/vnd.jupyter.widget-state+json": state}
              return json;
            }
            current.model.toJSON = toJSONWithoutOutput;
            await app.commands.execute('docmanager:save');
            current.model.toJSON = toJSON;
          }
        },
        isEnabled
    });
    palette.addItem({command:CommandIDs.saveWithWidgets, category:'Notebook Operations'})

  }
};

export default extension;
export namespace CommandIDs{
    export const saveAllWithoutOutputs = 'notebook:save-all-without-outputs'
    export const saveWithoutOutputs = 'notebook:save-without-outputs'
    export const saveWithWidgets = 'notebook:save-with-widgets'
}
