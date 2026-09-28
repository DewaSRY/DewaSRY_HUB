package com.sdewa.coreservices.content.body;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.FieldErrorItem;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The article body allowlist from ADR-009 §4.2. The allowlist <em>is</em> the sanitizer: unknown
 * node or mark types and invalid attribute values are rejected with {@code 400 VALIDATION_FAILED}
 * (field {@code body} or a path such as {@code body.content[12].marks[0].attrs.href}); unknown
 * attributes and unknown node keys are dropped. On success it returns the sanitized document plus
 * the derived fields of ADR-009 §4.4 ({@code body_text}, {@code word_count}, body image ids).
 */
@Component
public class ArticleBodyValidator {

    public static final int SCHEMA_VERSION = 1;
    public static final int MAX_BYTES = 512 * 1024;
    public static final int MAX_DEPTH = 20;
    public static final int MAX_IMAGES = 100;
    public static final int MAX_TABLE_COLUMNS = 20;
    public static final int MAX_TABLE_ROWS = 200;
    private static final int MAX_ERRORS = 25;

    private static final Set<String> BLOCKS = Set.of("paragraph", "heading", "bulletList", "orderedList", "taskList",
            "blockquote", "codeBlock", "horizontalRule", "callout", "details", "image", "embed", "bookmark", "table");
    /** Blocks that are not allowed inside table cells (ADR-009 §5.6). */
    private static final Set<String> NOT_IN_CELLS = Set.of("image", "embed", "bookmark", "table", "codeBlock");
    private static final Set<String> INLINE = Set.of("text", "hardBreak");
    private static final Set<String> ALIGN = Set.of("left", "center", "right");
    private static final Set<String> TONES = Set.of("info", "tip", "warning", "danger");
    private static final Set<String> IMAGE_WIDTHS = Set.of("content", "wide", "full");
    public static final Set<String> PALETTE = Set.of("gray", "red", "orange", "yellow", "green", "blue", "purple", "pink");
    public static final Set<String> CODE_LANGUAGES = Set.of("bash", "css", "diff", "dockerfile", "go", "html", "xml", "java",
            "javascript", "json", "kotlin", "markdown", "nginx", "python", "sql", "typescript", "yaml", "hcl", "plaintext");
    private static final Set<String> SIMPLE_MARKS = Set.of("bold", "italic", "underline", "strike", "code", "subscript", "superscript");
    private static final Set<String> MARKS = Set.of("bold", "italic", "underline", "strike", "code", "link", "textColor",
            "highlight", "subscript", "superscript");
    public static final Map<String, Pattern> EMBED_PROVIDERS = Map.of(
            "youtube", Pattern.compile("^[A-Za-z0-9_-]{11}$"),
            "vimeo", Pattern.compile("^\\d{1,12}$"),
            "codesandbox", Pattern.compile("^[a-z0-9-]{1,64}$"),
            "figma", Pattern.compile("^[A-Za-z0-9]{10,64}$"));

    private final JsonMapper mapper;

    public ArticleBodyValidator(JsonMapper mapper) {
        this.mapper = mapper;
    }

    /** Sanitized body and the fields derived from it. */
    public record Result(ObjectNode doc, String bodyText, int wordCount, Set<UUID> imageIds) {
    }

    public static ObjectNode emptyDoc() {
        ObjectNode doc = JsonNodeFactory.instance.objectNode();
        doc.put("type", "doc");
        doc.set("content", JsonNodeFactory.instance.arrayNode());
        return doc;
    }

    /** Validates and sanitizes; throws {@link ApiException} (400) listing every problem found. */
    public Result validate(JsonNode body) {
        Ctx ctx = new Ctx();
        if (body == null || body.isNull()) {
            throw ApiException.validation("body", "Is required.");
        }
        int size = mapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8).length;
        if (size > MAX_BYTES) {
            throw ApiException.validation("body", "Must be at most 512 KB of JSON.");
        }
        if (!body.isObject() || !"doc".equals(text(body.get("type")))) {
            throw ApiException.validation("body", "Must be a document object with type \"doc\".");
        }
        ObjectNode doc = JsonNodeFactory.instance.objectNode();
        doc.put("type", "doc");
        doc.set("content", content(body, "body", 1, ctx, Group.BLOCKS, false));
        if (ctx.images > MAX_IMAGES) {
            ctx.error("body", "Must contain at most " + MAX_IMAGES + " images.");
        }
        if (!ctx.errors.isEmpty()) {
            throw new ApiException(ErrorReason.VALIDATION_FAILED, ctx.errors);
        }
        String text = extractText(doc);
        return new Result(doc, text, countWords(text), ctx.imageIds);
    }

    private enum Group { BLOCKS, INLINE, CODE_TEXT, LIST_ITEMS, TASK_ITEMS, DETAILS, TABLE_ROWS, TABLE_CELLS, NONE }

    private ArrayNode content(JsonNode node, String path, int depth, Ctx ctx, Group group, boolean inCell) {
        ArrayNode out = JsonNodeFactory.instance.arrayNode();
        JsonNode content = node.get("content");
        if (content == null || content.isNull()) {
            return out;
        }
        if (!content.isArray()) {
            ctx.error(path + ".content", "Must be an array.");
            return out;
        }
        if (group == Group.NONE) {
            if (!content.isEmpty()) {
                ctx.error(path + ".content", "This node cannot have content.");
            }
            return out;
        }
        int i = 0;
        for (JsonNode child : content) {
            String childPath = path + ".content[" + i + "]";
            ObjectNode sanitized = node(child, childPath, depth + 1, ctx, group, inCell, i);
            if (sanitized != null) {
                out.add(sanitized);
            }
            i++;
            if (ctx.full()) {
                break;
            }
        }
        return out;
    }

    private ObjectNode node(JsonNode n, String path, int depth, Ctx ctx, Group group, boolean inCell, int index) {
        if (depth > MAX_DEPTH) {
            ctx.error(path, "Nesting is deeper than " + MAX_DEPTH + " levels.");
            return null;
        }
        if (n == null || !n.isObject()) {
            ctx.error(path, "Must be a node object.");
            return null;
        }
        String type = text(n.get("type"));
        if (type == null) {
            ctx.error(path, "A node needs a type.");
            return null;
        }
        if (!allowedIn(group, type, index)) {
            if (!BLOCKS.contains(type) && !INLINE.contains(type) && !isStructural(type)) {
                ctx.error(path, "Unknown node type \"" + type + "\".");
            } else {
                ctx.error(path, "Node \"" + type + "\" is not allowed here.");
            }
            return null;
        }
        if (inCell && NOT_IN_CELLS.contains(type)) {
            ctx.error(path, "Node \"" + type + "\" is not allowed inside table cells.");
            return null;
        }
        ObjectNode out = JsonNodeFactory.instance.objectNode();
        out.put("type", type);
        JsonNode attrs = n.get("attrs");
        if (attrs != null && !attrs.isNull() && !attrs.isObject()) {
            ctx.error(path + ".attrs", "Must be an object.");
            return null;
        }
        String ap = path + ".attrs";
        ObjectNode a = JsonNodeFactory.instance.objectNode();
        switch (type) {
            case "text" -> {
                JsonNode t = n.get("text");
                if (t == null || !t.isString() || t.stringValue().isEmpty()) {
                    ctx.error(path + ".text", "Must be a non-empty string.");
                    return null;
                }
                out.put("text", t.stringValue());
                ArrayNode marks = marks(n.get("marks"), path, ctx, group == Group.CODE_TEXT);
                if (!marks.isEmpty()) {
                    out.set("marks", marks);
                }
                return out;
            }
            case "hardBreak" -> {
                ArrayNode marks = marks(n.get("marks"), path, ctx, false);
                if (!marks.isEmpty()) {
                    out.set("marks", marks);
                }
                return out;
            }
            case "paragraph" -> {
                optionalEnum(attrs, "textAlign", ALIGN, a, ap, ctx);
                setContent(out, n, content(n, path, depth, ctx, Group.INLINE, inCell));
            }
            case "heading" -> {
                Integer level = intAttr(attrs, "level");
                if (level == null || level < 2 || level > 4) {
                    ctx.error(ap + ".level", "Must be 2, 3, or 4.");
                } else {
                    a.put("level", level);
                }
                optionalEnum(attrs, "textAlign", ALIGN, a, ap, ctx);
                setContent(out, n, content(n, path, depth, ctx, Group.INLINE, inCell));
            }
            case "bulletList" -> setContent(out, n, content(n, path, depth, ctx, Group.LIST_ITEMS, inCell));
            case "orderedList" -> {
                JsonNode start = attrs == null ? null : attrs.get("start");
                if (start != null && !start.isNull()) {
                    if (!start.isIntegralNumber() || !start.canConvertToInt() || start.intValue() < 1) {
                        ctx.error(ap + ".start", "Must be an integer of 1 or more.");
                    } else {
                        a.put("start", start.intValue());
                    }
                }
                setContent(out, n, content(n, path, depth, ctx, Group.LIST_ITEMS, inCell));
            }
            case "listItem", "blockquote", "detailsContent" -> setContent(out, n, content(n, path, depth, ctx, Group.BLOCKS, inCell));
            case "taskList" -> setContent(out, n, content(n, path, depth, ctx, Group.TASK_ITEMS, inCell));
            case "taskItem" -> {
                optionalBool(attrs, "checked", a, ap, ctx);
                setContent(out, n, content(n, path, depth, ctx, Group.BLOCKS, inCell));
            }
            case "codeBlock" -> {
                JsonNode lang = attrs == null ? null : attrs.get("language");
                if (lang != null && !lang.isNull()) {
                    if (!lang.isString() || !CODE_LANGUAGES.contains(lang.stringValue())) {
                        ctx.error(ap + ".language", "Must be one of the supported languages or null.");
                    } else {
                        a.put("language", lang.stringValue());
                    }
                }
                setContent(out, n, content(n, path, depth, ctx, Group.CODE_TEXT, inCell));
            }
            case "horizontalRule" -> content(n, path, depth, ctx, Group.NONE, inCell);
            case "callout" -> {
                JsonNode tone = attrs == null ? null : attrs.get("tone");
                if (tone == null || tone.isNull()) {
                    // absent: the renderer uses "info"
                } else if (!tone.isString() || !TONES.contains(tone.stringValue())) {
                    ctx.error(ap + ".tone", "Must be info, tip, warning, or danger.");
                } else {
                    a.put("tone", tone.stringValue());
                }
                setContent(out, n, content(n, path, depth, ctx, Group.BLOCKS, inCell));
            }
            case "details" -> {
                optionalBool(attrs, "open", a, ap, ctx);
                setContent(out, n, content(n, path, depth, ctx, Group.DETAILS, inCell));
            }
            case "detailsSummary" -> setContent(out, n, content(n, path, depth, ctx, Group.INLINE, inCell));
            case "image" -> {
                image(attrs, a, ap, ctx);
                content(n, path, depth, ctx, Group.NONE, inCell);
            }
            case "embed" -> {
                embed(attrs, a, ap, ctx);
                content(n, path, depth, ctx, Group.NONE, inCell);
            }
            case "bookmark" -> {
                bookmark(attrs, a, ap, ctx);
                content(n, path, depth, ctx, Group.NONE, inCell);
            }
            case "table" -> {
                ArrayNode rows = content(n, path, depth, ctx, Group.TABLE_ROWS, inCell);
                checkTableSize(rows, path, ctx);
                setContent(out, n, rows);
            }
            case "tableRow" -> setContent(out, n, content(n, path, depth, ctx, Group.TABLE_CELLS, inCell));
            case "tableHeader", "tableCell" -> {
                cellAttrs(attrs, a, ap, ctx);
                setContent(out, n, content(n, path, depth, ctx, Group.BLOCKS, true));
            }
            default -> {
                ctx.error(path, "Unknown node type \"" + type + "\".");
                return null;
            }
        }
        if (!a.isEmpty()) {
            out.set("attrs", a);
        }
        return out;
    }

    /** Keeps {@code content} only when the input node had it, so sanitizing is a no-op on clean input. */
    private static void setContent(ObjectNode out, JsonNode in, ArrayNode content) {
        JsonNode original = in.get("content");
        if (original != null && original.isArray()) {
            out.set("content", content);
        }
    }

    private static boolean isStructural(String type) {
        return Set.of("doc", "listItem", "taskItem", "detailsSummary", "detailsContent", "tableRow", "tableHeader", "tableCell")
                .contains(type);
    }

    private static boolean allowedIn(Group group, String type, int index) {
        return switch (group) {
            case BLOCKS -> BLOCKS.contains(type);
            case INLINE -> INLINE.contains(type);
            case CODE_TEXT -> type.equals("text");
            case LIST_ITEMS -> type.equals("listItem");
            case TASK_ITEMS -> type.equals("taskItem");
            case DETAILS -> index == 0 ? type.equals("detailsSummary") : type.equals("detailsContent");
            case TABLE_ROWS -> type.equals("tableRow");
            case TABLE_CELLS -> type.equals("tableHeader") || type.equals("tableCell");
            case NONE -> false;
        };
    }

    private ArrayNode marks(JsonNode marks, String path, Ctx ctx, boolean inCode) {
        ArrayNode out = JsonNodeFactory.instance.arrayNode();
        if (marks == null || marks.isNull()) {
            return out;
        }
        if (!marks.isArray()) {
            ctx.error(path + ".marks", "Must be an array.");
            return out;
        }
        if (inCode && !marks.isEmpty()) {
            ctx.error(path + ".marks", "Marks are not allowed inside code blocks.");
            return out;
        }
        Set<String> seen = new LinkedHashSet<>();
        int i = 0;
        for (JsonNode m : marks) {
            String mp = path + ".marks[" + i++ + "]";
            if (!m.isObject()) {
                ctx.error(mp, "Must be a mark object.");
                continue;
            }
            String type = text(m.get("type"));
            if (type == null || !MARKS.contains(type)) {
                ctx.error(mp, "Unknown mark type" + (type == null ? "." : " \"" + type + "\"."));
                continue;
            }
            if (!seen.add(type)) {
                continue;
            }
            JsonNode attrs = m.get("attrs");
            ObjectNode mark = JsonNodeFactory.instance.objectNode();
            mark.put("type", type);
            if (SIMPLE_MARKS.contains(type)) {
                out.add(mark);
                continue;
            }
            ObjectNode a = JsonNodeFactory.instance.objectNode();
            switch (type) {
                case "link" -> {
                    String href = attrs == null ? null : text(attrs.get("href"));
                    if (!isSafeHref(href)) {
                        ctx.error(mp + ".attrs.href", "Must be an https:, http:, or mailto: URL, or a site path starting with / or #.");
                        continue;
                    }
                    a.put("href", href.trim());
                }
                case "textColor", "highlight" -> {
                    String color = attrs == null ? null : text(attrs.get("color"));
                    if (color == null || !PALETTE.contains(color)) {
                        ctx.error(mp + ".attrs.color", "Must be a palette key: " + String.join(", ", PALETTE.stream().sorted().toList()) + ".");
                        continue;
                    }
                    a.put("color", color);
                }
                default -> {
                }
            }
            mark.set("attrs", a);
            out.add(mark);
        }
        return out;
    }

    /** ADR-009 §4.2 link rule: {@code https:}, {@code http:}, {@code mailto:}, or a site path starting with {@code /} or {@code #}. */
    public static boolean isSafeHref(String href) {
        if (href == null) {
            return false;
        }
        String h = href.trim();
        if (h.isEmpty() || h.length() > 2048) {
            return false;
        }
        for (int i = 0; i < h.length(); i++) {
            char c = h.charAt(i);
            if (Character.isISOControl(c) || Character.isWhitespace(c) || c == '\\') {
                return false;
            }
        }
        if (h.startsWith("#")) {
            return true;
        }
        if (h.startsWith("/")) {
            return !h.startsWith("//");
        }
        String lower = h.toLowerCase(Locale.ROOT);
        if (lower.startsWith("https://") || lower.startsWith("http://")) {
            try {
                URI u = new URI(h);
                return u.getHost() != null && !u.getHost().isBlank();
            } catch (Exception e) {
                return false;
            }
        }
        return lower.startsWith("mailto:") && h.length() > "mailto:".length();
    }

    private void image(JsonNode attrs, ObjectNode a, String ap, Ctx ctx) {
        ctx.images++;
        String id = attrs == null ? null : text(attrs.get("imageId"));
        UUID imageId = null;
        try {
            imageId = id == null ? null : UUID.fromString(id);
        } catch (IllegalArgumentException ignored) {
            // reported below
        }
        if (imageId == null) {
            ctx.error(ap + ".imageId", "Must be the id of an image from the media library.");
        } else {
            a.put("imageId", imageId.toString());
            ctx.imageIds.add(imageId);
        }
        optionalText(attrs, "alt", 250, a, ap, ctx);
        optionalText(attrs, "caption", 300, a, ap, ctx);
        JsonNode width = attrs == null ? null : attrs.get("width");
        if (width == null || width.isNull()) {
            // absent: the renderer uses "content"
        } else if (!width.isString() || !IMAGE_WIDTHS.contains(width.stringValue())) {
            ctx.error(ap + ".width", "Must be content, wide, or full.");
        } else {
            a.put("width", width.stringValue());
        }
    }

    private void embed(JsonNode attrs, ObjectNode a, String ap, Ctx ctx) {
        String provider = attrs == null ? null : text(attrs.get("provider"));
        String id = attrs == null ? null : text(attrs.get("id"));
        Pattern pattern = provider == null ? null : EMBED_PROVIDERS.get(provider);
        if (pattern == null) {
            ctx.error(ap + ".provider", "Must be youtube, vimeo, codesandbox, or figma.");
        } else if (id == null || !pattern.matcher(id).matches()) {
            ctx.error(ap + ".id", "Is not a valid " + provider + " id.");
        } else {
            a.put("provider", provider);
            a.put("id", id);
        }
        optionalText(attrs, "caption", 300, a, ap, ctx);
    }

    private void bookmark(JsonNode attrs, ObjectNode a, String ap, Ctx ctx) {
        String url = attrs == null ? null : text(attrs.get("url"));
        boolean ok = false;
        if (url != null && url.length() <= 2048 && url.toLowerCase(Locale.ROOT).startsWith("https://")) {
            try {
                URI u = new URI(url);
                ok = u.getHost() != null && !u.getHost().isBlank();
            } catch (Exception ignored) {
                ok = false;
            }
        }
        if (!ok) {
            ctx.error(ap + ".url", "Must be an https URL.");
        } else {
            a.put("url", url);
        }
        optionalText(attrs, "title", 300, a, ap, ctx);
        optionalText(attrs, "description", 1000, a, ap, ctx);
        optionalText(attrs, "siteName", 200, a, ap, ctx);
    }

    private void cellAttrs(JsonNode attrs, ObjectNode a, String ap, Ctx ctx) {
        for (String key : List.of("colspan", "rowspan")) {
            JsonNode v = attrs == null ? null : attrs.get(key);
            if (v == null || v.isNull()) {
                // absent: 1
            } else if (!v.isIntegralNumber() || !v.canConvertToInt() || v.intValue() < 1 || v.intValue() > 20) {
                ctx.error(ap + "." + key, "Must be an integer from 1 to 20.");
            } else {
                a.put(key, v.intValue());
            }
        }
        JsonNode cw = attrs == null ? null : attrs.get("colwidth");
        if (cw == null || cw.isNull()) {
            // absent / null: no fixed width
        } else if (!cw.isArray() || cw.size() > 20) {
            ctx.error(ap + ".colwidth", "Must be a list of integers or null.");
        } else {
            ArrayNode widths = JsonNodeFactory.instance.arrayNode();
            for (JsonNode w : cw) {
                if (w.isNull()) {
                    widths.addNull();
                } else if (!w.isIntegralNumber() || !w.canConvertToInt() || w.intValue() < 0 || w.intValue() > 10000) {
                    ctx.error(ap + ".colwidth", "Must be a list of integers or null.");
                    return;
                } else {
                    widths.add(w.intValue());
                }
            }
            a.set("colwidth", widths);
        }
    }

    private static void checkTableSize(ArrayNode rows, String path, Ctx ctx) {
        if (rows.size() > MAX_TABLE_ROWS) {
            ctx.error(path, "A table can have at most " + MAX_TABLE_ROWS + " rows.");
        }
        int maxCols = 0;
        for (JsonNode row : rows) {
            int cols = 0;
            for (JsonNode cell : row.path("content")) {
                cols += cell.path("attrs").path("colspan").asInt(1);
            }
            maxCols = Math.max(maxCols, cols);
        }
        if (maxCols > MAX_TABLE_COLUMNS) {
            ctx.error(path, "A table can have at most " + MAX_TABLE_COLUMNS + " columns.");
        }
    }

    private static void optionalEnum(JsonNode attrs, String key, Set<String> allowed, ObjectNode a, String ap, Ctx ctx) {
        JsonNode v = attrs == null ? null : attrs.get(key);
        if (v == null || v.isNull()) {
            return;
        }
        if (!v.isString() || !allowed.contains(v.stringValue())) {
            ctx.error(ap + "." + key, "Must be one of: " + String.join(", ", allowed.stream().sorted().toList()) + ".");
            return;
        }
        a.put(key, v.stringValue());
    }

    private static void optionalText(JsonNode attrs, String key, int max, ObjectNode a, String ap, Ctx ctx) {
        JsonNode v = attrs == null ? null : attrs.get(key);
        if (v == null || v.isNull()) {
            return;
        }
        if (!v.isString() || v.stringValue().length() > max) {
            ctx.error(ap + "." + key, "Must be text of at most " + max + " characters, or null.");
            return;
        }
        a.put(key, v.stringValue());
    }

    private static void optionalBool(JsonNode attrs, String key, ObjectNode a, String ap, Ctx ctx) {
        JsonNode v = attrs == null ? null : attrs.get(key);
        if (v == null || v.isNull()) {
            return;
        }
        if (!v.isBoolean()) {
            ctx.error(ap + "." + key, "Must be true or false.");
            return;
        }
        a.put(key, v.booleanValue());
    }

    private static Integer intAttr(JsonNode attrs, String key) {
        JsonNode v = attrs == null ? null : attrs.get(key);
        return v != null && v.isIntegralNumber() && v.canConvertToInt() ? v.intValue() : null;
    }

    private static String text(JsonNode n) {
        return n != null && n.isString() ? n.stringValue() : null;
    }

    /** ADR-009 §4.4: all text joined, blocks separated by newlines; no marks, image or embed data. */
    public static String extractText(JsonNode doc) {
        StringBuilder sb = new StringBuilder();
        appendText(doc, sb);
        return sb.toString().replaceAll("[ \\t]*\\n[\\s]*\\n+", "\n").strip();
    }

    private static void appendText(JsonNode node, StringBuilder sb) {
        String type = node.path("type").asString("");
        switch (type) {
            case "text" -> sb.append(node.path("text").asString(""));
            case "hardBreak" -> sb.append('\n');
            case "image", "embed", "bookmark", "horizontalRule" -> {
            }
            default -> {
                for (JsonNode child : node.path("content")) {
                    appendText(child, sb);
                }
                if (!type.equals("doc") && !type.isEmpty()) {
                    sb.append('\n');
                }
            }
        }
    }

    public static int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.strip().split("\\s+").length;
    }

    private static final class Ctx {
        final List<FieldErrorItem> errors = new ArrayList<>();
        final Set<UUID> imageIds = new LinkedHashSet<>();
        int images;

        void error(String field, String message) {
            if (errors.size() < MAX_ERRORS) {
                errors.add(new FieldErrorItem(field, message));
            }
        }

        boolean full() {
            return errors.size() >= MAX_ERRORS;
        }
    }
}
