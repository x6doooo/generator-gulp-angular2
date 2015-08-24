export class NamesList {
    private names = ['Dijkstra', 'Knuth', 'Turing', 'Hopper'];

    get() {
        return this.names;
    }
    add(value: string) {
        this.names.push(value);
    }
}
