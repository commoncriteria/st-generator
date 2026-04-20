/*
 * NOTICE:
 *
 * This software was produced for the U. S. Government
 * under Basic Contract No. W56KGU-18-D-0004, and is
 * subject to the Rights in Noncommercial Computer Software
 * and Noncommercial Computer Software Documentation
 * Clause 252.227-7014 (FEB 2014)
 *
 * © 2026 The MITRE Corporation.
 */

// Imports
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import Link from "@tiptap/extension-link";
import { Tooltip } from "@mui/material";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaSuperscript,
  FaSubscript,
  FaLink,
  FaListUl,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaAlignLeft,
  FaListOl,
  FaCode,
} from "react-icons/fa";
import { LuHeading1, LuHeading2 } from "react-icons/lu";
import { RiDeleteColumn, RiDeleteRow, RiInsertColumnLeft, RiInsertColumnRight } from "react-icons/ri";
import { GrTableAdd } from "react-icons/gr";
import { TbTableMinus } from "react-icons/tb";
import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Underline } from "@tiptap/extension-underline";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import { Card, CardFooter } from "@material-tailwind/react";
import { deepCopy } from "../../utils/deepCopy.js";
import { handleSnackBarSuccess, handleSnackBarError } from "../../utils/securityComponents.jsx";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import xml from "highlight.js/lib/languages/xml";
import "tw-elements-react/dist/css/tw-elements-react.min.css";
import "../../../index.css";
import "highlight.js/styles/a11y-dark.css";

/**
 * The TipTapEditor rich text editor
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const TipTapEditor = (props) => {
  // Prop Validation
  TipTapEditor.propTypes = {
    title: PropTypes.string,
    uuid: PropTypes.string,
    text: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.object.isRequired]),
    contentType: PropTypes.string.isRequired,
    handleTextUpdate: PropTypes.func.isRequired,
    elementData: PropTypes.object,
    readOnly: PropTypes.bool,
    index: PropTypes.number,
  };

  // Register languages
  const lowlight = createLowlight(all);
  lowlight.register("css", css);
  lowlight.register("javascript", javascript);
  lowlight.register("json", json);
  lowlight.register("plaintext", plaintext);
  lowlight.register("xml", xml);

  // Constants
  const { icons } = useSelector((state) => state.styling);
  const [isNewContent, setIsNewContent] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        paragraph: {
          renderHTML({ node }) {
            // Return plain text without wrapping it in <p> tags
            return node.text || "";
          },
        },
      }),
      Text,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "right", "center", "justify"],
        defaultAlignment: "left",
      }),
      Placeholder.configure({
        placeholder: "Enter your text here",
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
          target: "_blank",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: props.text || "",
    onUpdate({ editor }) {
      setIsNewContent(getIsNewContent(editor, props.text));
    },
    onBlur({ editor }) {
      if (isNewContent) {
        handleUpdateText(editor);
      }
    },
  });

  // Use Effects
  useEffect(() => {
    const { readOnly } = props;

    // Update editor to not be editable if it is readOnly
    if (editor && readOnly) {
      editor.setEditable(false);
    }
  }, [props.readOnly]);

  // Sync React props and TipTap editor instance
  useEffect(() => {
    if (!editor) return;

    // Normalize incoming prop to string
    const incoming = (typeof props.text === "string" ? props.text : "") || "";

    const current = editor.getHTML();

    // If the editor isn't focused (user is not actively typing) and the content differs, update it
    if (!editor.isFocused && current !== incoming) {
      editor.commands.setContent(incoming, false); // false = no undo step
    }
  }, [props.text, editor]);

  // Methods
  /**
   * Handles updating the editor text
   * @param editor the editor
   */
  const handleUpdateText = (editor) => {
    try {
      // Get content as HTML
      const { text, contentType, uuid, title, index, elementData, readOnly, handleTextUpdate } = props;
      const newContent = getIsNewContent(editor, text);

      // Check if the text has changed
      if (newContent) {
        const htmlContent = deepCopy(editor.getHTML().trim());

        // Update the content based on type
        if (contentType === "editor") {
          handleTextUpdate(htmlContent);
        } else if (contentType === "term") {
          handleTextUpdate(htmlContent, title, index, uuid);
        } else if (contentType === "element" || (contentType === "requirement" && readOnly === undefined)) {
          const update = { description: htmlContent };

          handleTextUpdate(update, elementData.uuid, elementData.index, "update");
        }

        // Update snackbar success message
        setIsNewContent(false);
        handleSnackBarSuccess("Text Successfully Updated");
      }
    } catch (e) {
      console.log(e);
      handleSnackBarError(e);
    }
  };

  // Helper Methods
  /**
   * Checks if the content is new
   * @param editor the editor
   * @param text the text
   * @returns {boolean}
   */
  const getIsNewContent = (editor, text) => {
    const currentContent = editor.getHTML().trim();
    const trimmedText = text ? text.trim() : "";
    const formattedText = `<p>${trimmedText}</p>`;
    const isTrimmedText = JSON.stringify(currentContent) !== JSON.stringify(trimmedText);
    const isFormattedText = JSON.stringify(currentContent) !== JSON.stringify(formattedText);

    // Check for updates
    return isTrimmedText && isFormattedText;
  };

  // Return Method
  return (
    <div className='mb-2'>
      <Card className={"border-0 p-0 m-0"}>
        <CardFooter className={"m-0 p-0 border-0"}>
          <div className='m-0 p-0 w-full border-0'>
            {editor && (
              <div className={"bg-[#f9f9f9] border-2 border-gray-300 rounded-lg w-full overflow-x-hidden min-w-full"}>
                {!props.readOnly && (
                  <div>
                    <MenuBar editor={editor} icons={icons} />
                    <TableBubbleMenu editor={editor} />
                  </div>
                )}
                <div className='p-4 text-left'>
                  <EditorContent editor={editor} />
                </div>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

// Export TipTapEditor.jsx
export default TipTapEditor;

// External Components
/**
 * The MenuBar used to update the rich text editor
 * @param editor the editor
 * @param icons the icons
 * @returns {Element}
 * @constructor
 */
const MenuBar = ({ editor, icons }) => {
  // Prop Types
  MenuBar.propTypes = {
    editor: PropTypes.object.isRequired,
    icons: PropTypes.object.isRequired,
  };

  // Constants
  const { textEditor } = icons;

  // Methods
  /**
   * Prevents editor blur when clicking on menu bar buttons
   * @param event the event as a domNode
   */
  const handleMouseDown = (event) => {
    // Prevents focus loss
    event.preventDefault();
  };
  /**
   * Wraps the selected text into a code block instead of the whole line of text
   */
  const wrapSelectedTextInCodeBlock = () => {
    const { state, commands } = editor;

    // Check if the current selection is inside a code block
    if (editor.isActive("codeBlock")) {
      // If the selection is inside a code block, toggle it off (remove the code block)
      commands.toggleNode("paragraph", "codeBlock");
    } else {
      // Otherwise, get the selected text
      const { from, to } = state.selection;
      const selectedText = state.doc.textBetween(from, to);

      // Wrap in a code block
      if (from === to) {
        // If no text is selected, insert an empty code block at the cursor position
        commands.insertContentAt(from, `<pre><code></code></pre>`);
      } else if (selectedText) {
        // Wrap the selected text in a code block
        commands.insertContentAt({ from, to }, `<pre><code>${selectedText}</code></pre>`);
      }
    }
  };

  // Return Method
  return (
    <div className='menu-bar border-b-2 border-gray-300' onMouseDown={handleMouseDown}>
      <Tooltip title={"Bold"}>
        <button onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "is-active" : ""}>
          <FaBold style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Italic"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}>
          <FaItalic style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Underline"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "is-active" : ""}>
          <FaUnderline style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Strike Through"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "is-active" : ""}>
          <FaStrikethrough style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Superscript"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={editor.isActive("superscript") ? "is-active" : ""}>
          <FaSuperscript style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Subscript"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={editor.isActive("subscript") ? "is-active" : ""}>
          <FaSubscript style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Left"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={editor.isActive({ textAlign: "left" }) ? "is-active" : ""}>
          <FaAlignLeft style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Center"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? "is-active" : ""}>
          <FaAlignCenter style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Right"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={editor.isActive({ textAlign: "right" }) ? "is-active" : ""}>
          <FaAlignRight style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Justify"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={editor.isActive({ textAlign: "justify" }) ? "is-active" : ""}>
          <FaAlignJustify style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Bullet List"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}>
          <FaListUl style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Ordered List"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}>
          <FaListOl style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Heading 1"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}>
          <LuHeading1 />
        </button>
      </Tooltip>
      <Tooltip title={"Heading 2"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}>
          <LuHeading2 />
        </button>
      </Tooltip>
      <Tooltip title={"Insert/Edit Link"}>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href;
            const url = window.prompt("Enter URL", previousUrl);
            if (url === null) return;

            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }

            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          className={editor.isActive("link") ? "is-active" : ""}>
          <FaLink style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip title={"Insert Table"}>
        <button onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}>
          <GrTableAdd style={textEditor} />
        </button>
      </Tooltip>
      <Tooltip
        title={
          <div>
            Code Block
            <br />
            <br />* Note: Press Command/Ctrl + Enter to leave the code block and return to editing the paragraph.
          </div>
        }>
        <button
          onMouseDown={handleMouseDown}
          onClick={() => {
            wrapSelectedTextInCodeBlock();
          }}
          className={editor.isActive("codeBlock") ? "is-active" : ""}>
          <FaCode style={textEditor} />
        </button>
      </Tooltip>
    </div>
  );
};

/**
 * The table bubble menu used for editing the table in the rich text editor
 * @param editor
 * @returns {Element}
 * @constructor
 */
const TableBubbleMenu = ({ editor }) => {
  // Prop Types
  TableBubbleMenu.propTypes = {
    editor: PropTypes.object.isRequired,
  };

  // Return Method
  return (
    editor && (
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor, view, state, oldState, from, to }) => {
          // only show the bubble menu for tables
          return editor.isActive("table");
        }}>
        <div className='bubble-menu'>
          <Tooltip title={"Insert Left"}>
            <button onClick={() => editor.chain().focus().addColumnBefore().run()}>
              <RiInsertColumnLeft className='tiptap-icon' />
            </button>
          </Tooltip>
          <Tooltip title={"Insert Right"}>
            <button onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <RiInsertColumnRight className='tiptap-icon' />
            </button>
          </Tooltip>
          <Tooltip title={"Insert Above"}>
            <button onClick={() => editor.chain().focus().addRowBefore().run()}>
              <RiInsertColumnLeft className='row-before-icon' />
            </button>
          </Tooltip>
          <Tooltip title={"Insert Below"}>
            <button onClick={() => editor.chain().focus().addRowAfter().run()}>
              <RiInsertColumnLeft className='row-after-icon' />
            </button>
          </Tooltip>
          <Tooltip title={"Delete Column"}>
            <button onClick={() => editor.chain().focus().deleteColumn().run()}>
              <RiDeleteColumn className='tiptap-icon' />
            </button>
          </Tooltip>
          <Tooltip title={"Delete Row"}>
            <button onClick={() => editor.chain().focus().deleteRow().run()}>
              <RiDeleteRow className='tiptap-icon' />
            </button>
          </Tooltip>
          <Tooltip title={"Delete Table"}>
            <button onClick={() => editor.chain().focus().deleteTable().run()}>
              <TbTableMinus className='tiptap-icon' />
            </button>
          </Tooltip>
        </div>
      </BubbleMenu>
    )
  );
};
