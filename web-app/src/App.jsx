import React from "react";
import "./App.css";
import { produce } from "immer";
import { mutate, readonly, useMutateable } from "use-immer-store";

import { io, Socket } from "socket.io-client";
import { CellList } from "./Notebook";
import styled from "styled-components";
import { deserialize } from "./deserialize-value-to-show";

import dot from "@observablehq/graphviz";
import { IonIcon } from "@ionic/react";
import {
  gitNetworkOutline,
  iceCreamOutline,
  pizzaOutline,
  terminalOutline,
} from "ionicons/icons";
import { EditorState, StateField } from "@codemirror/state";
import {
  CellEditorStatesField,
  CellIdFacet,
  CellMetaField,
  editor_state_for_cell,
  // expand_cell_effects_that_area_actually_meant_for_the_nexus,
  MutateNotebookEffect,
  NotebookFacet,
  NotebookField,
  updateCellsFromNexus,
  useNotebookviewWithExtensions,
} from "./NotebookEditor";
import { useRealMemo } from "use-real-memo";
import { notebook_in_nexus } from "./packages/codemirror-nexus/add-move-and-run-cells";
// import { CellIdOrder } from "./packages/codemirror-nexus/codemirror-cell-movement";
import { SelectedCellsField, selected_cells_keymap } from "./cell-selection";
// import {
//   NexusToCellEmitterFacet,
//   send_to_cell_effects_to_emitter,
//   SingleEventEmitter,
// } from "./packages/codemirror-nexus/codemirror-nexus";
import { keymap, runScopeHandlers } from "@codemirror/view";
import {
  shared_history,
  historyKeymap,
} from "./packages/codemirror-nexus/codemirror-shared-history";
import { mapValues } from "lodash";

let AppStyle = styled.div`
  padding-top: 100px;
  min-height: 100vh;
  padding-bottom: 100px;
  margin-right: 20px;

  flex: 1;
  flex-basis: min(700px, 100vw - 200px, 100%);
  min-width: 0;
`;

let MyButton = styled.button`
  font-size: 0.6rem;
  hyphens: auto;
  text-align: center;
  border: none;

  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;

  &.active {
    background-color: rgb(45 21 29);
    color: white;
  }

  ion-icon {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
`;

let DependenciesTab = () => {
  return (
    <div style={{ padding: 16 }}>
      <h1>Dependencies</h1>
      <p>
        Automatically manage dependencies, but actually nice this time. Possibly
        having the actual `import X from "..."` cells living here.
      </p>
    </div>
  );
};

let GraphTab = ({ dag }) => {
  /** @type {any} */
  let ref = React.useRef();
  React.useEffect(() => {
    console.log(`engine:`, dag);
    let element = dot`
      digraph {
        ${Object.values(dag)
          .flatMap((from) => from.out.map((to) => `"${from.id}" -> "${to.id}"`))
          .join("\n")}
      }
    `;
    console.log(`element:`, element);
    // Remove children
    while (ref.current.firstChild) {
      ref.current.removeChild(ref.current.firstChild);
    }
    ref.current.appendChild(element);
  }, [dag]);
  return (
    <div style={{ padding: 16 }}>
      <h1>Graph</h1>
      <p>
        A graph/visualisation of how the cells are connected... haven't figured
        out a nice way yet, so here is a ugly graph.
      </p>
      <div ref={ref}></div>
    </div>
  );
};

let ShellTab = () => {
  return (
    <div style={{ padding: 16 }}>
      <h1>Shell</h1>
      <p>
        Very ambitious: I want this to be a linear notebook that works kind of
        like a REPL, having access to the variables created in the main
        notebook, but not the other way around. And then, ideally, being able to
        drag cells from here to the main notebook.
      </p>
    </div>
  );
};

let MetaTab = () => {
  return (
    <div style={{ padding: 16 }}>
      <h1>Meta</h1>
      <p>
        I want this page to become a notebook that can access the main process,
        and influence the notebook web page. This way you can write your own
        plugins.
      </p>
    </div>
  );
};

let try_json = (str) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return null;
  }
};

// let cell_id_order_from_notebook_facet = CellIdOrder.compute(
//   [NotebookFacet],
//   (state) => state.facet(NotebookFacet).cell_order
// );

function App() {
  let initial_notebook = React.useMemo(
    () =>
      CellEditorStatesField.init((editorstate) => {
        /** @type {import("./notebook-types").Notebook} */
        let notebook_from_json = try_json(
          localStorage.getItem("_notebook")
        ) ?? {
          id: "1",
          cell_order: ["1"],
          cells: {
            1: {
              id: "1",
              code: "1 + 1 + xs.length",
              unsaved_code: "1 + 1 + xs.length",
              last_run: Date.now(),
            },
            // 2: {
            //   id: "2",
            //   code: "let xs = [1,2,3,4]",
            //   unsaved_code: "let xs = [1,2,3,4]",
            //   last_run: Date.now(),
            // },
          },
        };

        return {
          cell_order: notebook_from_json.cell_order,
          cells: mapValues(notebook_from_json.cells, (cell) => {
            return editor_state_for_cell(cell, editorstate).update({});
          }),
        };
      }),
    [NotebookField]
  );

  let { state, dispatch } = useNotebookviewWithExtensions({
    extensions: [
      // expand_cell_effects_that_area_actually_meant_for_the_nexus,

      initial_notebook,
      updateCellsFromNexus,

      // React.useMemo(
      //   () => NotebookFacet.from(NotebookField),
      //   [NotebookFacet, NotebookField]
      // ),
      // cell_id_order_from_notebook_facet,
      SelectedCellsField,
      // // blur_cells_when_selecting,
      // selected_cells_keymap,
      // notebook_in_nexus,

      useRealMemo(() => [shared_history(), keymap.of(historyKeymap)], []),
      // keep_track_of_last_created_cells_extension,
    ],
  });

  let cell_editor_states = state.field(CellEditorStatesField);

  let _notebook = React.useMemo(() => {
    return /** @type {import("./notebook-types").Notebook} */ ({
      cell_order: cell_editor_states.cell_order,
      cells: mapValues(cell_editor_states.cells, ({ state: cell_state }) => {
        return {
          id: cell_state.facet(CellIdFacet),
          unsaved_code: cell_state.doc.toString(),
          ...cell_state.field(CellMetaField),
        };
      }),
    });
  }, [cell_editor_states]);

  /** @type {import("./NotebookEditor").NotebookView} */
  let notebook_view = { state: state, dispatch: dispatch };

  let update_state = React.useCallback(
    (
      /** @type {(notebook: import("./notebook-types").Notebook) => void} */ update_fn
    ) => {
      dispatch({
        effects: MutateNotebookEffect.of({ mutate_fn: update_fn }),
      });
    },
    [dispatch]
  );

  // Use the nexus' keymaps as shortcuts!
  // This passes on keydown events from the document to the nexus for handling.
  React.useEffect(() => {
    let fn = (event) => {
      if (event.defaultPrevented) {
        return;
      }
      let should_cancel = runScopeHandlers(
        // @ts-ignore
        { state, dispatch },
        event,
        "editor"
      );
      if (should_cancel) {
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.removeEventListener("keydown", fn);
    };
  }, [state, dispatch]);

  /** @type {import("./notebook-types").Notebook} */
  let notebook = useMutateable(_notebook, update_state);

  let [engine, set_engine] = React.useState({ cylinders: {} });
  /** @type {React.MutableRefObject<Socket<any, any>>} */
  let socketio_ref = React.useRef(/** @type {any} */ (null));
  React.useEffect(() => {
    let socket = io("http://localhost:3099");

    socket.on("engine", (engine) => {
      set_engine(engine);
    });
    socketio_ref.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  React.useEffect(() => {
    let socket = socketio_ref.current;
    let fn = () => {
      socket.emit("notebook", notebook);
    };
    socket.on("connect", fn);
    return () => {
      socket.off("connect", fn);
    };
  }, [notebook]);

  React.useEffect(() => {
    let socket = socketio_ref.current;
    console.log(`readonly(notebook):`, readonly(notebook));
    socket.emit("notebook", notebook);
  }, [notebook]);

  let [open_tab, set_open_tab] = React.useState(
    /** @type {null | "graph" | "dependencies" | "shell" | "meta"} */
    (null)
  );

  // @ts-ignore
  let dag = React.useMemo(
    // @ts-ignore
    () => (engine.dag == null ? null : deserialize(0, engine.dag)),
    // @ts-ignore
    [engine.dag]
  );

  return (
    <div style={{ display: "flex" }}>
      <AppStyle data-can-start-cell-selection>
        <CellList
          notebook_view={notebook_view}
          notebook={notebook}
          engine={engine}
        />
      </AppStyle>
      <div style={{ flex: 1 }} data-can-start-cell-selection />
      {open_tab != null && (
        <div
          style={{
            width: 400,
            backgroundColor: "rgb(45 21 29)",
            height: "100vh",
            position: "sticky",
            top: 0,
          }}
        >
          {open_tab === "graph" && <GraphTab dag={dag} />}
          {open_tab === "dependencies" && <DependenciesTab />}
          {open_tab === "shell" && <ShellTab />}
          {open_tab === "meta" && <MetaTab />}
        </div>
      )}
      <div
        style={{
          flex: "0 0 50px",
          backgroundColor: "rgba(0,0,0,.4)",
          height: "100vh",
          position: "sticky",
          top: 0,

          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          paddingTop: 32,
          paddingBottom: 32,
        }}
      >
        <MyButton
          className={open_tab === "graph" ? "active" : ""}
          onClick={() => {
            set_open_tab((x) => (x === "graph" ? null : "graph"));
          }}
        >
          <IonIcon icon={gitNetworkOutline} />
          graph
        </MyButton>
        <MyButton
          className={open_tab === "dependencies" ? "active" : ""}
          onClick={() => {
            set_open_tab((x) => (x === "dependencies" ? null : "dependencies"));
          }}
        >
          <IonIcon icon={pizzaOutline} />
          dependencies
        </MyButton>
        <MyButton
          className={open_tab === "shell" ? "active" : ""}
          onClick={() => {
            set_open_tab((x) => (x === "shell" ? null : "shell"));
          }}
        >
          <IonIcon icon={terminalOutline} />
          shell
        </MyButton>
        <MyButton
          className={open_tab === "meta" ? "active" : ""}
          onClick={() => {
            set_open_tab((x) => (x === "meta" ? null : "meta"));
          }}
        >
          <IonIcon icon={iceCreamOutline} />
          meta
        </MyButton>
      </div>
    </div>
  );
}

export default App;
